import bcrypt from "bcryptjs";
import { db, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import * as client from "openid-client";

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";

export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  return bcrypt.compare(password, stored);
}

export async function ensureProfile(userId: string, email: string | null) {
  const existing = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.id, userId));
  if (existing.length) return existing[0];
  const handle = (email?.split("@")[0] || "user").slice(0, 24);
  const [created] = await db
    .insert(profilesTable)
    .values({
      id: userId,
      username: handle,
      displayName: handle,
      avatarUrl: "",
      city: "Bangkok",
    })
    .returning();
  return created;
}

let oidcConfig: client.Configuration | null = null;
export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID env var not set; Replit Auth unavailable");
    }
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID,
    );
  }
  return oidcConfig;
}
