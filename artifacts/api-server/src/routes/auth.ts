import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, profilesTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import {
  clearSession,
  createSession,
  getOidcConfig,
  getSessionId,
  hashPassword,
  setSessionCookie,
  verifyPassword,
  type AuthUser,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

const credSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

function toAuthUser(u: typeof usersTable.$inferSelect): AuthUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
  };
}

async function ensureProfile(userId: string, email: string | null) {
  const existing = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (existing.length) return;
  const handle = (email?.split("@")[0] || "user").slice(0, 24);
  await db.insert(profilesTable).values({
    id: userId,
    username: handle,
    displayName: handle,
    avatarUrl: "",
    city: "Bangkok",
  });
}

// ── current user ─────────────────────────────────────────────────────────
router.get("/auth/me", (req: Request, res: Response) => {
  res.json({ user: req.isAuthenticated() ? req.user : null });
});

// ── email + password ─────────────────────────────────────────────────────
router.post("/auth/signup", async (req: Request, res: Response) => {
  const parsed = credSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง (≥6 ตัว)" });
    return;
  }
  const { email, password } = parsed.data;
  const lower = email.toLowerCase();

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, lower));
  if (existing.length) {
    res.status(409).json({ error: "อีเมลนี้มีในระบบแล้ว ให้กดเข้าใช้แทน" });
    return;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      email: lower,
      passwordHash: hashPassword(password),
    })
    .returning();

  await ensureProfile(created.id, created.email);

  const sid = await createSession({ user: toAuthUser(created) });
  setSessionCookie(res, sid);
  res.json({ user: toAuthUser(created) });
});

router.post("/auth/signin", async (req: Request, res: Response) => {
  const parsed = credSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    return;
  }
  const { email, password } = parsed.data;
  const lower = email.toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, lower));
  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    return;
  }
  if (!verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    return;
  }

  await ensureProfile(user.id, user.email);
  const sid = await createSession({ user: toAuthUser(user) });
  setSessionCookie(res, sid);
  res.json({ user: toAuthUser(user) });
});

router.post("/auth/signout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ ok: true });
});

// ── Replit Auth (OIDC) ───────────────────────────────────────────────────
router.get("/auth/replit/login", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/auth/replit/callback`;
    const returnTo = getSafeReturnTo(req.query.returnTo);

    const state = oidc.randomState();
    const nonce = oidc.randomNonce();
    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const redirectTo = oidc.buildAuthorizationUrl(config, {
      redirect_uri: callbackUrl,
      scope: "openid email profile offline_access",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      prompt: "login consent",
      state,
      nonce,
    });

    setOidcCookie(res, "qx_code_verifier", codeVerifier);
    setOidcCookie(res, "qx_nonce", nonce);
    setOidcCookie(res, "qx_state", state);
    setOidcCookie(res, "qx_return_to", returnTo);

    res.redirect(redirectTo.href);
  } catch (err) {
    req.log.error({ err }, "Replit login init failed");
    res
      .status(500)
      .send("Replit Auth ยังไม่พร้อม (REPL_ID ไม่ถูกตั้งค่าหรือ network ขัดข้อง)");
  }
});

router.get("/auth/replit/callback", async (req: Request, res: Response) => {
  try {
    const config = await getOidcConfig();
    const callbackUrl = `${getOrigin(req)}/api/auth/replit/callback`;

    const codeVerifier = req.cookies?.qx_code_verifier;
    const nonce = req.cookies?.qx_nonce;
    const expectedState = req.cookies?.qx_state;

    if (!codeVerifier || !expectedState) {
      res.redirect("/api/auth/replit/login");
      return;
    }

    const currentUrl = new URL(
      `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
    );

    const tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.redirect("/api/auth/replit/login");
      return;
    }

    const sub = claims.sub as string;
    const email = (claims.email as string) || null;
    const lowerEmail = email?.toLowerCase() ?? null;

    // Try find by replit_user_id first, then by email (link existing account)
    const [byReplit] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.replitUserId, sub));

    let user = byReplit;
    if (!user && lowerEmail) {
      const [byEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, lowerEmail));
      user = byEmail;
    }

    if (user) {
      const [updated] = await db
        .update(usersTable)
        .set({
          replitUserId: sub,
          email: user.email ?? lowerEmail,
          firstName: (claims.first_name as string) ?? user.firstName,
          lastName: (claims.last_name as string) ?? user.lastName,
          profileImageUrl:
            ((claims.profile_image_url || claims.picture) as string) ??
            user.profileImageUrl,
        })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated;
    } else {
      const [created] = await db
        .insert(usersTable)
        .values({
          email: lowerEmail,
          replitUserId: sub,
          firstName: (claims.first_name as string) || null,
          lastName: (claims.last_name as string) || null,
          profileImageUrl:
            ((claims.profile_image_url || claims.picture) as string) || null,
        })
        .returning();
      user = created;
    }

    await ensureProfile(user.id, user.email);

    const returnTo = getSafeReturnTo(req.cookies?.qx_return_to);
    res.clearCookie("qx_code_verifier", { path: "/" });
    res.clearCookie("qx_nonce", { path: "/" });
    res.clearCookie("qx_state", { path: "/" });
    res.clearCookie("qx_return_to", { path: "/" });

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: toAuthUser(user),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);
    res.redirect(returnTo);
  } catch (err) {
    req.log.error({ err }, "Replit callback failed");
    res.redirect("/");
  }
});

export default router;

// suppress unused warning for `or` import (kept for future composite queries)
void or;
