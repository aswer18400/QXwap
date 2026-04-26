import type { SqlStep } from "./types";

export const listingAndSearchSteps: SqlStep[] = [
  {
    name: "alter.items_image_urls",
    sql: `ALTER TABLE items ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}'`,
  },
  {
    name: "alter.items_search_vector",
    sql: `ALTER TABLE items ADD COLUMN IF NOT EXISTS search_vector tsvector`,
  },
  {
    name: "index.items_search",
    sql: `CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN(search_vector)`,
  },
  {
    name: "fn.items_search_vector_update",
    sql: `
      CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
          setweight(to_tsvector('simple', coalesce(NEW.description,'')), 'B') ||
          setweight(to_tsvector('simple', coalesce(NEW.wanted_text,'')), 'C') ||
          setweight(to_tsvector('simple', coalesce(NEW.category,'')), 'D');
        RETURN NEW;
      END; $$
    `,
  },
  { name: "trigger.drop_items_search_vector", sql: `DROP TRIGGER IF EXISTS items_search_vector_trigger ON items` },
  {
    name: "trigger.create_items_search_vector",
    sql: `
      CREATE TRIGGER items_search_vector_trigger
      BEFORE INSERT OR UPDATE ON items
      FOR EACH ROW EXECUTE FUNCTION items_search_vector_update()
    `,
  },
  {
    name: "backfill.items_search_vector",
    sql: `
      UPDATE items SET search_vector =
        setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
        setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
        setweight(to_tsvector('simple', coalesce(wanted_text,'')), 'C') ||
        setweight(to_tsvector('simple', coalesce(category,'')), 'D')
      WHERE search_vector IS NULL
    `,
  },
];
