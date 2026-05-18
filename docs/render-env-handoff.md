# Render Env Handoff — Ready to Paste

This file is the bridge from "Supabase configured" to "Render deployed". Use
the Render dashboard for the values the MCP cannot expose (service role key,
DB connection string). Treat this file as transient — do **not** commit real
secrets into it.

## Supabase Project (already provisioned)

```text
Project ref:    cpradtvneftyeflwjvmx
Project URL:    https://cpradtvneftyeflwjvmx.supabase.co
Region:         ap-south-1
Postgres:       17.6
Status:         ACTIVE_HEALTHY
Org:            aswer18400's Org (uecsmaakvyimqswroitc)
```

Tables migrated (24 in `public`), storage bucket `qxwap` exists (public, 5MB
limit, image-only MIME types). RLS now enabled on every public table.

## Values You Can Paste Now

```text
SUPABASE_URL          = https://cpradtvneftyeflwjvmx.supabase.co
STORAGE_BUCKET        = qxwap
NODE_ENV              = production
FRONTEND_ORIGIN       = https://aswer18400.github.io
PORT                  = 3000
SESSION_SECRET        = <Render generates this automatically per render.yaml,
                         or use: node -e "console.log(require('crypto').randomBytes(48).toString('base64'))">
```

## Values You Must Retrieve from Supabase Dashboard

The MCP cannot return these for security:

### 1. `DATABASE_URL`

Path: Supabase dashboard → Project Settings → Database → Connection string
→ URI tab.

Two flavors visible:

- **Direct connection** (port 5432) — Postgres native, lowest latency, fewest
  connections. Use this for Render web service.
- **Session pooler** (port 6543) — pgbouncer transaction pooling. Use only if
  you hit connection limits.

Format (Direct):

```text
postgresql://postgres:[YOUR-DB-PASSWORD]@db.cpradtvneftyeflwjvmx.supabase.co:5432/postgres?sslmode=require
```

Replace `[YOUR-DB-PASSWORD]` with the password chosen at project creation
(your password manager has it; do not reset unless necessary — it cascades to
other places).

Append `?sslmode=require` if Supabase shows the bare URL.

### 2. `SUPABASE_SERVICE_ROLE_KEY`

Path: Supabase dashboard → Project Settings → API → "service_role" secret.

Treat this as god mode for the DB. Never put it in:

- Frontend code
- GitHub Pages repo variables (those are read by browsers)
- Screenshots, Figma, AI chat transcripts
- This file once committed

## Render Web Service Setup

Dashboard: https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg

### Settings tab — confirm exactly these values

```text
Root Directory:       <blank> or .
Build Command:        corepack prepare pnpm@9.15.4 --activate
                      pnpm install --frozen-lockfile --prod=false
                      pnpm --filter @workspace/api-server build
Start Command:        pnpm --filter @workspace/api-server start
Health Check Path:    /api/health
Health Check Timeout: 30
```

If any of those differ, update them and save. Render does NOT auto-apply
`render.yaml` changes to an existing service — you must mirror them by hand
(or re-import the blueprint).

### Environment tab — paste these

```text
NODE_ENV                     = production
PORT                         = 3000
SUPABASE_URL                 = https://cpradtvneftyeflwjvmx.supabase.co
STORAGE_BUCKET               = qxwap
FRONTEND_ORIGIN              = https://aswer18400.github.io
SESSION_SECRET               = <Render auto-generated, do not change>
DATABASE_URL                 = <from §1 above>
SUPABASE_SERVICE_ROLE_KEY    = <from §2 above>
```

### Before pasting: validate locally

Before opening Render's Environment tab, validate all values in your shell:

```bash
cd <repo-root>
NODE_ENV=production \
PORT=3000 \
SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64'))")" \
FRONTEND_ORIGIN=https://aswer18400.github.io \
DATABASE_URL='<paste from §1>' \
SUPABASE_URL=https://cpradtvneftyeflwjvmx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY='<paste from §2>' \
STORAGE_BUCKET=qxwap \
pnpm check:render-env
```

The script fails non-zero on:

- Wrong NODE_ENV / weak SESSION_SECRET / dev fallback secret
- HTTP origin (must be HTTPS), trailing slash, or path in FRONTEND_ORIGIN
- DATABASE_URL host that doesn't match SUPABASE_URL project ref
- Service role key that decodes to `role: "anon"` (i.e. you pasted the wrong key)
- Missing `sslmode=require` on the DB connection (warns)
- All-or-nothing Supabase storage env mismatch

Only after `[QXwap Render env check] passed` should you paste into Render.

### Trigger deploy

After saving env vars: **Manual Deploy → Clear build cache & deploy → Deploy
latest commit**.

Watch the build log. Build success looks like:

```text
✓ pnpm install --frozen-lockfile --prod=false
✓ pnpm --filter @workspace/api-server build
   tsc -p tsconfig.json
✓ Deploy live
```

## Post-Deploy Verification

```bash
curl -s https://qxwap-api.onrender.com/api/health | python3 -m json.tool
```

Must include `name: "QXwap API"`, `database: "connected"`,
`required_tables: 18`, `required_tables_expected: 18`.

```bash
curl -s https://qxwap-api.onrender.com/api/version | python3 -m json.tool
```

`commit` must match the latest `main` SHA on GitHub (first 40 chars).

Full smoke from your Mac:

```bash
cd <repo-root>
API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api
```

Expected: ends with `ok: true` JSON containing `commit`, `item_id`,
`offer_id`, and an `upload_url` starting with
`https://cpradtvneftyeflwjvmx.supabase.co/storage/v1/object/public/qxwap/...`.

If `upload_url` still starts with `/uploads/...`, the three Supabase env vars
are not all set on Render. Re-check.

## Security Notes from This Session

- RLS was disabled on all 24 public tables prior to this session. PostgREST
  on the anon key could read/write every row. Migration
  `enable_rls_on_public_tables` (applied via Supabase MCP) closed that.
- The function `public.items_search_vector_update` had a mutable
  `search_path`. Migration `harden_items_search_vector_search_path` (applied
  via Supabase MCP) pinned it to `pg_catalog, public`.
- Remaining Supabase advisor items are all INFO level
  (`rls_enabled_no_policy` per table) — expected and intentional, because our
  API uses the Postgres `postgres` role via `DATABASE_URL` which bypasses RLS,
  and we do not use Supabase Auth/PostgREST from the frontend.
- The `auth_leaked_password_protection` WARN is unrelated — we don't use
  Supabase Auth. Optionally enable it from the dashboard if we adopt it.

## After Render Is Healthy

1. Run the full UI click-through in `docs/ui-qa-checklist.md` against the
   production URL.
2. Tick the relevant boxes in `docs/manual-qa.md` and the deploy-day runbook
   sign-off.
3. Update `AI_START_HERE.md`: remove the "Render runtime still on stub"
   warning from §Current Status.
4. Delete this file from the working tree once the values are entered into
   Render (it does not contain real secrets, but having a "secrets-shaped"
   doc invites mistakes).
