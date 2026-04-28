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
    // Drizzle push owns table creation; startup only keeps additive objects
    // and backfills that are not expressed in the schema package.
    await client.query(
      `ALTER TABLE items ADD COLUMN IF NOT EXISTS wanted_tags text[] NOT NULL DEFAULT '{}'`,
    );
    await client.query(
      `ALTER TABLE items ADD COLUMN IF NOT EXISTS open_to_offers boolean NOT NULL DEFAULT true`,
    );
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
