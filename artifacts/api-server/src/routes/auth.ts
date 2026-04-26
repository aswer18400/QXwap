import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, and, gt, isNull } from "drizzle-orm";
import { z } from "zod/v4";
import {
  ensureProfile,
  getOidcConfig,
  hashPassword,
  verifyPassword,
  type AuthUser,
} from "../lib/auth";
import { sendError, sendValidationError } from "../lib/http";
import { pool } from "@workspace/db";
import { sendMail, otpHtml } from "../lib/mailer";
import crypto from "crypto";

const router: IRouter = Router();

const credSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: isProd,
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
    emailVerified: u.emailVerified ?? false,
  };
}

function loginSession(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
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
    sendValidationError(res, "อีเมลหรือรหัสผ่านไม่ถูกต้อง (≥6 ตัว)", parsed.error);
    return;
  }
  const { email, password } = parsed.data;
  const lower = email.toLowerCase();

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, lower));
  if (existing.length) {
    sendError(res, 409, "conflict", "อีเมลนี้มีในระบบแล้ว ให้กดเข้าใช้แทน");
    return;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      email: lower,
      passwordHash: await hashPassword(password),
    })
    .returning();

  await ensureProfile(created.id, created.email);
  await loginSession(req, created.id);
  res.json({ user: toAuthUser(created) });
});

router.post("/auth/signin", async (req: Request, res: Response) => {
  const parsed = credSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "อีเมลหรือรหัสผ่านไม่ถูกต้อง", parsed.error);
    return;
  }
  const { email, password } = parsed.data;
  const lower = email.toLowerCase();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, lower));
  if (!user || !user.passwordHash) {
    sendError(res, 401, "unauthorized", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    return;
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    sendError(res, 401, "unauthorized", "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    return;
  }

  await ensureProfile(user.id, user.email);
  await loginSession(req, user.id);
  res.json({ user: toAuthUser(user) });
});

router.post("/auth/signout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      sendError(res, 500, "internal_error", "signout failed");
      return;
    }
    res.clearCookie("qx_sid", { path: "/" });
    res.json({ ok: true });
  });
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
    const cookieOpts = { path: "/" as const };
    res.clearCookie("qx_code_verifier", cookieOpts);
    res.clearCookie("qx_nonce", cookieOpts);
    res.clearCookie("qx_state", cookieOpts);
    res.clearCookie("qx_return_to", cookieOpts);

    const now = Math.floor(Date.now() / 1000);
    await loginSession(req, user.id);
    req.session.replit = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };
    await new Promise<void>((resolve, reject) =>
      req.session.save((e) => (e ? reject(e) : resolve())),
    );

    res.redirect(returnTo);
  } catch (err) {
    req.log.error({ err }, "Replit callback failed");
    res.redirect("/");
  }
});

// ── helpers ──────────────────────────────────────────────────────────────
function generate6DigitOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

async function createOtp(userId: string, purpose: "reset" | "verify"): Promise<string> {
  const code = generate6DigitOtp();
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO auth_otps(user_id, purpose, code_hash, expires_at) VALUES($1,$2,$3,$4)`,
      [userId, purpose, codeHash, expiresAt],
    );
  } finally {
    client.release();
  }
  return code;
}

async function verifyOtp(email: string, code: string, purpose: "reset" | "verify"): Promise<string | null> {
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ id: string; user_id: string }>(
      `SELECT o.id, o.user_id FROM auth_otps o
       JOIN users u ON u.id = o.user_id
       WHERE u.email = $1 AND o.purpose = $2 AND o.code_hash = $3
         AND o.expires_at > NOW() AND o.used_at IS NULL
       LIMIT 1`,
      [email.toLowerCase(), purpose, codeHash],
    );
    if (!rows.length) return null;
    const row = rows[0]!;
    await client.query(`UPDATE auth_otps SET used_at = NOW() WHERE id = $1`, [row.id]);
    return row.user_id;
  } finally {
    client.release();
  }
}

// ── POST /auth/forgot-password ────────────────────────────────────────────
router.post("/auth/forgot-password", async (req: Request, res: Response) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "อีเมลไม่ถูกต้อง", parsed.error);
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (user) {
    const code = await createOtp(user.id, "reset");
    await sendMail({
      to: email,
      subject: "QXwap — รีเซ็ตรหัสผ่าน",
      html: otpHtml(code, "reset"),
      text: `รหัส OTP สำหรับรีเซ็ตรหัสผ่าน: ${code} (หมดอายุใน 15 นาที)`,
    });
  }
  // Always return 200 to prevent email enumeration
  res.json({ ok: true, message: "ถ้าอีเมลนี้มีในระบบ เราจะส่งรหัส OTP ไปให้" });
});

// ── POST /auth/reset-password ─────────────────────────────────────────────
router.post("/auth/reset-password", async (req: Request, res: Response) => {
  const parsed = z.object({
    email: z.string().email(),
    code: z.string().length(6),
    newPassword: z.string().min(6),
  }).safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลไม่ถูกต้อง", parsed.error);
    return;
  }
  const { email, code, newPassword } = parsed.data;
  const userId = await verifyOtp(email, code, "reset");
  if (!userId) {
    sendError(res, 400, "invalid_otp", "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
    return;
  }
  await db.update(usersTable)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(usersTable.id, userId));
  res.json({ ok: true, message: "รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง" });
});

// ── POST /auth/send-verify-email ──────────────────────────────────────────
router.post("/auth/send-verify-email", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { sendError(res, 401, "unauthorized", "กรุณาเข้าสู่ระบบ"); return; }
  const email = req.user.email;
  if (!email) { sendError(res, 400, "no_email", "บัญชีนี้ไม่มีอีเมล"); return; }
  const code = await createOtp(req.user.id, "verify");
  await sendMail({
    to: email,
    subject: "QXwap — ยืนยันอีเมล",
    html: otpHtml(code, "verify"),
    text: `รหัส OTP สำหรับยืนยันอีเมล: ${code} (หมดอายุใน 15 นาที)`,
  });
  res.json({ ok: true, message: "ส่งรหัส OTP ไปที่อีเมลของคุณแล้ว" });
});

// ── POST /auth/verify-email ───────────────────────────────────────────────
router.post("/auth/verify-email", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { sendError(res, 401, "unauthorized", "กรุณาเข้าสู่ระบบ"); return; }
  const parsed = z.object({ code: z.string().length(6) }).safeParse(req.body);
  if (!parsed.success) { sendValidationError(res, "รหัส OTP ไม่ถูกต้อง", parsed.error); return; }
  const email = req.user.email;
  if (!email) { sendError(res, 400, "no_email", "บัญชีนี้ไม่มีอีเมล"); return; }
  const userId = await verifyOtp(email, parsed.data.code, "verify");
  if (!userId || userId !== req.user.id) {
    sendError(res, 400, "invalid_otp", "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
    return;
  }
  const pgClient = await pool.connect();
  try {
    await pgClient.query(`UPDATE users SET email_verified = true WHERE id = $1`, [userId]);
  } finally {
    pgClient.release();
  }
  res.json({ ok: true, message: "ยืนยันอีเมลสำเร็จ" });
});

// ── DELETE /auth/account ──────────────────────────────────────────────────
// Soft-delete: anonymise PII, keep rows for referential integrity.
router.delete("/auth/account", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { sendError(res, 401, "unauthorized", "กรุณาเข้าสู่ระบบ"); return; }
  const userId = req.user.id;
  const client = await pool.connect();
  try {
    // Anonymise user record
    await client.query(
      `UPDATE users SET email = 'deleted_' || id || '@deleted', password_hash = NULL,
       first_name = 'Deleted', last_name = 'User', profile_image_url = NULL,
       replit_user_id = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );
    // Anonymise profile
    await client.query(
      `UPDATE profiles SET display_name = 'Deleted User', username = 'deleted_' || id,
       avatar_url = '', bio = NULL WHERE id = $1`,
      [userId],
    );
    // Destroy session
    req.session.destroy(() => {
      res.clearCookie("qx_sid", { path: "/" });
      res.json({ ok: true, message: "ลบบัญชีสำเร็จ" });
    });
  } finally {
    client.release();
  }
});

export default router;
