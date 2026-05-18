# Supabase Migrations

Every migration applied to the production Supabase project
(`cpradtvneftyeflwjvmx`) lives here in chronological order.

## Re-applying to a fresh project

Install the Supabase CLI, link to the new project, and run:

```bash
supabase db push
```

Or apply manually in order:

```bash
psql "$DATABASE_URL" -f 20260514035837_enable_rls_on_public_tables.sql
psql "$DATABASE_URL" -f 20260514035926_harden_items_search_vector_search_path.sql
psql "$DATABASE_URL" -f 20260514143917_align_schema_with_api_code.sql
psql "$DATABASE_URL" -f 20260514144117_add_id_defaults_to_remaining_tables.sql
psql "$DATABASE_URL" -f 20260515021859_drop_not_null_on_legacy_deals_columns.sql
```

The migrations are idempotent (`IF NOT EXISTS`, `ENABLE … RLS`, `SET DEFAULT`),
so re-running them on an already-current project is a no-op.

## Why these exist

The Supabase project was provisioned by an earlier version of the app with a
slightly different schema. The migrations here are the corrections needed to
make the schema match what `apps/api/src/server.ts` actually writes today.
See each file's header comment for the specific bug it fixed.

## Authoritative schema for fresh databases

For a new local PGlite database (development) the source of truth is
`apps/api/src/db.ts migrate()`, which creates tables with the up-to-date
schema using `CREATE TABLE IF NOT EXISTS`. That code is enough on its own —
the SQL files here are only needed when reproducing the legacy Supabase
shape on a brand-new Supabase project, or when re-applying the security
hardening from this session (RLS + function search_path).
