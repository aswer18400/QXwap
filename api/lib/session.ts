import { getDb } from "../queries/connection";
import { userSessions } from "@db/schema";
import { eq } from "drizzle-orm";

export type SessionData = {
  userId: string;
  email: string;
};

export async function createSession(data: SessionData): Promise<string> {
  const db = await getDb();
  const sid = crypto.randomUUID();
  const expire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(userSessions).values({
    sid,
    sess: data as any,
    expire,
  });
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  if (!sid) return null;
  const db = await getDb();
  const rows = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.sid, sid))
    .limit(1);
  if (!rows.length) return null;
  const row = rows[0];
  if (new Date() > row.expire) {
    await db.delete(userSessions).where(eq(userSessions.sid, sid));
    return null;
  }
  return row.sess as SessionData;
}

export async function destroySession(sid: string): Promise<void> {
  const db = await getDb();
  await db.delete(userSessions).where(eq(userSessions.sid, sid));
}

export function serializeCookie(name: string, value: string, opts?: { maxAge?: number; httpOnly?: boolean; sameSite?: string; secure?: boolean; path?: string }): string {
  let cookie = `${name}=${value}`;
  if (opts?.maxAge) cookie += `; Max-Age=${opts.maxAge}`;
  if (opts?.httpOnly) cookie += `; HttpOnly`;
  if (opts?.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts?.secure) cookie += `; Secure`;
  cookie += `; Path=${opts?.path || '/'}`;
  return cookie;
}

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
}
