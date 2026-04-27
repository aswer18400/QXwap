import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

async function ensurePgcryptoExtension(client: {
  query: (sql: string) => Promise<unknown>;
}) {
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  } catch (err) {
    logger.warn({ err }, "migration.pgcrypto_unavailable");
  }
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await ensurePgcryptoExtension(client);
    await client.query(`
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
    `);
    await client.query(`
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
    `);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username varchar`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name varchar`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url varchar`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city varchar NOT NULL DEFAULT 'Bangkok'`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_status boolean NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating_avg numeric(3, 2) NOT NULL DEFAULT '0'`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS successful_deals_count integer NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings text NOT NULL DEFAULT '{}'`);
    await client.query(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        sid varchar PRIMARY KEY NOT NULL,
        sess json NOT NULL,
        expire timestamp(6) NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS IDX_user_sessions_expire ON user_sessions (expire)
    `);
    await client.query(
      `ALTER TABLE items ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'`,
    );
    await client.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false`,
    );
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_otps (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        purpose varchar NOT NULL,
        code_hash varchar NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS offer_chats (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id varchar NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS offer_messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id varchar NOT NULL,
        sender_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message text NOT NULL,
        image_url text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE offer_messages ADD COLUMN IF NOT EXISTS image_url text`);
    await client.query(`
      CREATE INDEX IF NOT EXISTS offer_messages_chat_created_idx
      ON offer_messages (chat_id, created_at)
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS disputes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deal_id varchar,
        reason varchar NOT NULL,
        detail text,
        status varchar NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // Full-text search vector on items
    await client.query(
      `ALTER TABLE items ADD COLUMN IF NOT EXISTS search_vector tsvector`,
    );
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN(search_vector)
    `);
    await client.query(`
      CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW.wanted_text,'')), 'C') ||
          setweight(to_tsvector('simple', coalesce(NEW.category,'')), 'D');
        RETURN NEW;
      END; $$
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS items_search_vector_trigger ON items
    `);
    await client.query(`
      CREATE TRIGGER items_search_vector_trigger
      BEFORE INSERT OR UPDATE ON items
      FOR EACH ROW EXECUTE FUNCTION items_search_vector_update()
    `);
    // Back-fill existing rows
    await client.query(`
      UPDATE items SET search_vector =
        setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
        setweight(to_tsvector('simple', coalesce(wanted_text,'')), 'C') ||
        setweight(to_tsvector('simple', coalesce(category,'')), 'D')
      WHERE search_vector IS NULL
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id varchar NOT NULL,
        reviewer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(deal_id, reviewer_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(blocker_id, blocked_id)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(follower_id, following_id)
      )
    `);
  } catch (err) {
    logger.error({ err }, "migration.failed");
    throw err;
  } finally {
    client.release();
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runMigrations()
  .then(() => {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }
      logger.info({ port }, "Server listening");
    });
  })
  .catch((err) => {
    logger.error({ err }, "Failed to run migrations");
    process.exit(1);
  });
