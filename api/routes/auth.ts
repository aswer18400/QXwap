import { Hono } from "hono";
import { getDb } from "../queries/connection";
import { users, profiles } from "@db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, getSession, serializeCookie, parseCookies } from "../lib/session";

const auth = new Hono();

auth.post("/signup", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  const db = await getDb();
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) {
    return c.json({ error: "Email already registered" }, 409);
  }
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();
  await db.insert(users).values({ id: userId, email, passwordHash });
  await db.insert(profiles).values({ id: userId });
  await db.insert(profiles).values({ id: userId }).onConflictDoNothing(); // safe duplicate guard
  // create wallet
  const { wallets } = await import("@db/schema");
  await db.insert(wallets).values({ userId, creditBalance: 0 }).onConflictDoNothing();
  const sid = await createSession({ userId, email });
  c.header("Set-Cookie", serializeCookie("sid", sid, { httpOnly: true, sameSite: "Lax", maxAge: 7 * 24 * 60 * 60 }));
  return c.json({ user: { id: userId, email } });
});

auth.post("/signin", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!rows.length) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const user = rows[0];
  const bcrypt = await import("bcryptjs");
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const sid = await createSession({ userId: user.id, email: user.email });
  c.header("Set-Cookie", serializeCookie("sid", sid, { httpOnly: true, sameSite: "Lax", maxAge: 7 * 24 * 60 * 60 }));
  return c.json({ user: { id: user.id, email: user.email } });
});

auth.post("/signout", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const sid = cookies["sid"];
  if (sid) await destroySession(sid);
  c.header("Set-Cookie", serializeCookie("sid", "", { httpOnly: true, sameSite: "Lax", maxAge: 0 }));
  return c.json({ ok: true });
});

auth.get("/me", async (c) => {
  const cookies = parseCookies(c.req.header("cookie") || "");
  const sid = cookies["sid"];
  if (!sid) return c.json({ user: null });
  const session = await getSession(sid);
  if (!session) {
    c.header("Set-Cookie", serializeCookie("sid", "", { httpOnly: true, sameSite: "Lax", maxAge: 0 }));
    return c.json({ user: null });
  }
  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!rows.length) {
    return c.json({ user: null });
  }
  const user = rows[0];
  const profs = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  return c.json({ user: { id: user.id, email: user.email, profile: profs[0] || null } });
});

export default auth;
