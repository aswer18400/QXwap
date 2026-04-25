import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

async function runMigrations() {
  const client = await pool.connect();
  try {
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
      CREATE TABLE IF NOT EXISTS disputes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deal_id varchar REFERENCES deals(id) ON DELETE SET NULL,
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
        deal_id varchar NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        reviewer_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment text,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(deal_id, reviewer_id)
      )
    `);
  } catch (err) {
    logger.warn({ err }, "migration.warning");
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
