import type { SqlStep } from "./types";

export const authAndProfileSteps: SqlStep[] = [
  {
    name: "alter.users_email_verified",
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false`,
  },
  {
    name: "table.auth_otps",
    sql: `
      CREATE TABLE IF NOT EXISTS auth_otps (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose varchar NOT NULL,
        code_hash varchar NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz
      )
    `,
  },
  { name: "alter.profiles_bio", sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text` },
  {
    name: "alter.profiles_notification_settings",
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings text NOT NULL DEFAULT '{}'`,
  },
  {
    name: "table.follows",
    sql: `
      CREATE TABLE IF NOT EXISTS follows (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(follower_id, following_id)
      )
    `,
  },
  {
    name: "table.blocks",
    sql: `
      CREATE TABLE IF NOT EXISTS blocks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(blocker_id, blocked_id)
      )
    `,
  },
];
