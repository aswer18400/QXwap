# QXwap — AI Handoff (2026-05-15)

This is the snapshot another AI/dev should read first before continuing.
Pair with `AI_START_HERE.md` for routing; this file is the "what changed
recently + what to do next" delta.

## Quick Read

- GitHub source of truth: `<repo-root>`
- GitHub: `https://github.com/aswer18400/QXwap` (source of truth)
- Frontend live: `https://aswer18400.github.io/QXwap/`
- Backend (Render): `https://qxwap-api.onrender.com` — service `srv-d7mfphu7r5hc73868seg`
- Supabase project: `cpradtvneftyeflwjvmx` (ap-south-1, Postgres 17.6, ACTIVE_HEALTHY)
- Bucket: `qxwap` (public, 5MB, image-only)

## Where we left off

Backend code + Supabase schema are now fully aligned. Every API write path was
exercised against the live Supabase Postgres via the Supabase MCP, inside
`BEGIN ... ROLLBACK` so no real data was changed. All 9 critical flows pass:

- A. transitionOffer "accepted" — create deal with `buyer_id/seller_id/item_id`
- B. transitionOffer "confirmed" — two-row swap-reward insert
- C. wallet credit (+100) via `IN ($1,$2)`
- D. `/api/wallet/deposit` insert + update
- E. `/api/notifications/read` (mark-all and mark-one)
- F. Item create with `deal_type='sell'` + `search_vector` populated by trigger
- G. Offer status `cancelled` (UK spelling)
- H. Chat conversation + message auto-id
- I. Shipment with pickup/dropoff photo URLs

The remaining blocker is **deploy mechanics**: the Render service still serves
a stale runtime at `qxwap-api.onrender.com`. Once it picks up the latest
commit AND the env vars get pasted, the API is good to go.

## What was fixed this session (Supabase MCP migrations)

1. `enable_rls_on_public_tables` — RLS enabled on all 24 public tables.
   Without this, the anon JWT could `curl
   https://cpradtvneftyeflwjvmx.supabase.co/rest/v1/users` and read every
   user/profile/session row.
2. `harden_items_search_vector_search_path` — pinned the trigger function's
   `search_path` to `pg_catalog, public`.
3. `align_schema_with_api_code` — added six missing columns and three
   missing enum values:
   - `offers.rejection_reason TEXT`
   - `offers.instant_swap BOOLEAN DEFAULT false`
   - `offers.logistics JSONB DEFAULT '{}'`
   - `profiles.account_level INTEGER DEFAULT 2`
   - `shipments.pickup_photo_url TEXT`
   - `shipments.dropoff_photo_url TEXT`
   - enum `offer_status` += `cancelled`, `confirmed`
   - enum `deal_type` += `sell`
4. `add_id_defaults_to_remaining_tables` — set `id DEFAULT gen_random_uuid()`
   on `transactions`, `item_images`, `chat_conversations`, `offer_items`,
   `notifications`, `chat_messages`, `shipments`. Without these every API
   INSERT that omits `id` (most of them) threw `23502 NOT NULL`.
5. `drop_not_null_on_legacy_deals_columns` — `deals.sender_id`,
   `deals.receiver_id`, `deals.target_item_id` were NOT NULL from an older
   schema; API writes only `buyer_id/seller_id/item_id`. Dropped the
   NOT NULL constraints instead of dropping the columns.

## What was fixed in API code (this session)

- `apps/api/src/server.ts`
  - Replaced the `($2::uuid IS NULL OR id=$2)` pattern in
    `/api/notifications/read` with an application-level branch
    (`if (req.body?.id)`). Old pattern worked on PGlite (uuid id) but
    throws `operator does not exist: text = uuid` on Supabase.
  - Added regression test `marks notifications as read without a uuid cast`
    in `apps/api/tests/api.test.ts`.

## Current test suite (14 tests, all expected to pass locally)

1. serves health and seeded items
2. sets security headers on every response
3. exposes build metadata at /api/version
4. emits x-request-id on every response
5. returns 401 for invalid login
6. signin response time does not leak email existence (timing test)
7. allows account with no products to send instant-swap offer
8. persists uploads and newly created items
9. persists profile avatar after signout and re-login
10. enforces owner-only item edit/delete + viewer.is_owner
11. marks notifications as read without a uuid cast (cross-dialect safe)
12. rate-limits /api/auth/signup to 5 requests/min with 429 + retry-after
13. filters items by q, category, condition, deal_type, wanted_tag, combos

Run on Mac:

```bash
cd <repo-root>
pnpm --filter @workspace/api-server test
```

## Fastest path — one command does everything

```bash
cd <repo-root>
pnpm deploy:now
```

The interactive helper prompts twice (`DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — hidden input), generates a fresh `SESSION_SECRET`, validates via `check:render-env`, prints the exact values to paste into Render, waits while you paste + Manual Deploy, then polls `/api/health` and `/api/version` for up to 10 minutes, runs `smoke:api` (basic), then `smoke:full` (two-session: owner gating, search/filter, profile photo persistence, offer → accept → shipment, notifications cross-dialect). Exits with a "🎉 Deploy verified" banner only when every assertion passes.

## Render — what the next AI/user must still do (manual variant)

If you prefer step-by-step over `pnpm deploy:now`:

1. Get `DATABASE_URL` from Supabase dashboard:
   Settings → Database → Connection string → URI → use the **Direct
   connection** form, replace `[YOUR-DB-PASSWORD]`, append `?sslmode=require`
   if missing.
2. Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard:
   Settings → API → "service_role" secret.
3. Validate locally before pasting into Render:

```bash
cd <repo-root>
NODE_ENV=production \
PORT=3000 \
SESSION_SECRET="$(pnpm -s secret:session)" \
FRONTEND_ORIGIN=https://aswer18400.github.io \
DATABASE_URL='<from §1>' \
SUPABASE_URL=https://cpradtvneftyeflwjvmx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY='<from §2>' \
STORAGE_BUCKET=qxwap \
pnpm check:render-env
```

4. Open Render dashboard:
   `https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg` → Settings
   tab. Confirm:
   - Root Directory: blank or `.`
   - Build Command: `corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/api-server build`
   - Start Command: `pnpm --filter @workspace/api-server start`
   - Health Check Path: `/api/health`
5. Environment tab — paste all the values from step 3 plus `STORAGE_BUCKET=qxwap`.
6. Manual Deploy → **Clear build cache & deploy** → latest commit.
7. Verify:

```bash
curl -s https://qxwap-api.onrender.com/api/health | python3 -m json.tool
curl -s https://qxwap-api.onrender.com/api/version | python3 -m json.tool
API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api
```

- `/api/health` must include `"name":"QXwap API"`, `"database":"connected"`,
  `"required_tables":18`.
- `/api/version.commit` must match latest main SHA.
- `pnpm smoke:api` must end with `"ok":true` and `upload_url` starting with
  `https://cpradtvneftyeflwjvmx.supabase.co/storage/v1/object/public/qxwap/`.

If `upload_url` still starts with `/uploads/`, the three Supabase storage env
vars are not all set on Render. Re-check.

8. Visit `https://aswer18400.github.io/QXwap/status.html` to see the
   human-readable health page. PASS pills on both cards = done.

## What is NOT covered yet

- Browser click-through QA on the prod URL — `docs/ui-qa-checklist.md` lists
  27 manual steps across owner gating, search/filter, profile photo. Run
  these once the Render API is healthy.
- The 6 extra "legacy" columns on `deals` (`fulfillment_type`, `pickup_slot`,
  `pickup_point`, etc.) remain in the schema as nullable. They are unused
  by the current API and harmless. Drop them in a future migration if
  desired.
- The local `apps/api/src/db.ts migrate()` does not include the
  `ALTER TYPE ADD VALUE` or `ALTER COLUMN SET DEFAULT` statements applied to
  Supabase, because the local PGlite schema uses TEXT + CHECK instead of
  enums. If a fresh Supabase project is ever provisioned, the equivalent
  migrations from `supabase/migrations` (recorded by MCP) will need to be
  re-applied. The four migration names to look for:
  - `enable_rls_on_public_tables`
  - `harden_items_search_vector_search_path`
  - `align_schema_with_api_code`
  - `add_id_defaults_to_remaining_tables`
  - `drop_not_null_on_legacy_deals_columns`
- Multi-instance Render scaling will break the in-memory rate limiter
  (`server.ts` rateBuckets). Swap for Redis when needed.
- Frontend currently has no UX for `RATE_LIMITED` (429) responses. Show a
  toast with `retry_after_sec`.

## Read These If You Get Stuck

| Situation | Doc |
|---|---|
| Health check shows `{"ok":true}` only | `docs/ops-runbook.md` §4.1 |
| Build fails on Render | `docs/ops-runbook.md` §4.2 |
| DB not connected | `docs/ops-runbook.md` §4.3 |
| Image upload 404 | `docs/ops-runbook.md` §4.4 |
| Login fails on prod | `docs/ops-runbook.md` §4.5 |
| CORS preflight 403 | `docs/ops-runbook.md` §4.6 |
| 502/504 from Render | `docs/ops-runbook.md` §4.7 |
| Need to roll back | `docs/ops-runbook.md` §6 |
| Want second-opinion review | `docs/chatgpt-review-handoff.md` |
| Need a fresh deploy-day walkthrough | `docs/deploy-day-runbook.md` |
| Need to validate env before pasting | `pnpm check:render-env` |

## Hard rules (must read before continuing)

- Do not deploy unless explicitly asked.
- Do not guess real secrets. MCP cannot return the service role key — the
  human must paste it.
- Do not rewrite the monorepo structure.
- Do not commit `docs/render-env-handoff.md` with real values filled in.
- After verifying a flow against the live API, tick the relevant box in
  `docs/manual-qa.md` and append a one-line entry to this file's "Where we
  left off" section so the next AI knows.
