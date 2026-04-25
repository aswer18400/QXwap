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
