import type { SqlStep } from "./types";

export const coreSteps: SqlStep[] = [
  { name: "extension.pgcrypto", sql: `CREATE EXTENSION IF NOT EXISTS pgcrypto` },
  {
    name: "table.users",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar UNIQUE,
        password_hash varchar,
        replit_user_id varchar UNIQUE,
        first_name varchar,
        last_name varchar,
        profile_image_url varchar,
        email_verified boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `,
  },
  {
    name: "table.profiles",
    sql: `
      CREATE TABLE IF NOT EXISTS profiles (
        id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        username varchar,
        display_name varchar,
        avatar_url varchar,
        bio text,
        city varchar NOT NULL DEFAULT 'Bangkok',
        verified_status boolean NOT NULL DEFAULT false,
        rating_avg numeric(3, 2) NOT NULL DEFAULT '0',
        successful_deals_count integer NOT NULL DEFAULT 0,
        notification_settings text NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `,
  },
  {
    name: "table.user_sessions",
    sql: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid varchar PRIMARY KEY NOT NULL,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
    `,
  },
  {
    name: "index.user_sessions_expire",
    sql: `CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire)`,
  },
];
