import { Hono, type Context } from "hono";
import { getDb } from "../queries/connection";
import { users, profiles, wallets } from "@db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, getSession, serializeCookie, parseCookies } from "../lib/session";
import { env } from "../lib/env";

const auth = new Hono();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type AuthStatus = 400 | 401 | 404 | 409 | 500;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: env.isProduction ? "None" : "Lax",
    secure: env.isProduction,
    maxAge,
  };
}

function jsonError(c: Context, message: string, status: AuthStatus = 400) {
  return c.json({ success: false, message, error: message }, status);
}

async function readAuthBody(c: Context) {
  try {
    const body = await c.req.json<{ email?: string; password?: string }>();
    return {
      email: typeof body.email === "string" ? body.email.trim().toLowerCase() : "",
      password: typeof body.password === "string" ? body.password : "",
    };
  } catch {
    return null;
  }
}

async function signupHandler(c: Context) {
  const body = await readAuthBody(c);
  if (!body) return jsonError(c, "Invalid JSON body");

  const { email, password } = body;
  if (!email || !password) return jsonError(c, "Email and password required");
  if (!emailRegex.test(email)) return jsonError(c, "Invalid email format");
  if (password.length < 6) return jsonError(c, "Password must be at least 6 characters");

  const db = await getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return jsonError(c, "Email already registered", 409);

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();

  await db.insert(users).values({ id: userId, email, passwordHash });
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing();
  await db.insert(wallets).values({ userId, creditBalance: 0 }).onConflictDoNothing();

  const sid = await createSession({ userId, email });
  c.header("Set-Cookie", serializeCookie("sid", sid, sessionCookieOptions(7 * 24 * 60 * 60)));
  return c.json({ success: true, message: "register success", user: { id: userId, email, profile: null } });
}

async function signinHandler(c: Context) {
  const body = await readAuthBody(c);
  if (!body) return jsonError(c, "Invalid JSON body");

  const { email, password } = body;
  if (!email || !password) return jsonError(c, "Email and password required");

  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!rows.length) return jsonError(c, "Invalid email or password", 401);

  const user = rows[0];
  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return jsonError(c, "Invalid email or password", 401);

  const sid = await createSession({ userId: user.id, email: user.email });
  c.header("Set-Cookie", serializeCookie("sid", sid, sessionCookieOptions(7 * 24 * 60 * 60)));
  return c.json({ success: true, message: "login success", user: { id: user.id, email: user.email, profile: null } });
}

auth.post("/signup", signupHandler);
auth.post("/register", signupHandler);

auth.post("/signin", signinHandler);
auth.post("/login", signinHandler);

auth.post("/signout", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const sid = cookies["sid"];
  if (sid) await destroySession(sid);
  c.header("Set-Cookie", serializeCookie("sid", "", sessionCookieOptions(0)));
  return c.json({ success: true, message: "logout success" });
});

auth.get("/me", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const sid = cookies["sid"];
  if (!sid) return c.json({ success: true, user: null });
  const session = await getSession(sid);
  if (!session) {
    c.header("Set-Cookie", serializeCookie("sid", "", sessionCookieOptions(0)));
    return c.json({ success: true, user: null });
  }
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!rows.length) return c.json({ success: true, user: null });
  const user = rows[0];
  const profs = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return c.json({ success: true, user: { id: user.id, email: user.email, profile: profs[0] || null } });
});

auth.onError((err, c) => {
  console.error("[auth] route failed", err);
  return c.json({ success: false, message: "Authentication service error", error: "Authentication service error" }, 500);
});

export default auth;
