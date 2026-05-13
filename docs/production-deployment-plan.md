# QXwap Production Deployment Plan

This plan gets QXwap from local working app to a production-ready deployment. Do not deploy until the owner explicitly approves the target services and environment values.

Detailed staging setup checklist: `docs/staging-setup-guide.md`.

## Current Local Status

Last verified locally on 2026-05-13:

- Monorepo typecheck passed.
- API tests passed.
- API build passed.
- Web production build passed.
- Feed mobile QA at 390px passed with no horizontal scroll.
- Frontend create-product flow refreshes Feed/Shop.
- Xwap offer flow works for an account with no products.
- Inbox accept flow can start Instant Swap shipment tracking.

## Recommended Production Shape

Frontend:

- GitHub Pages or Netlify static hosting.
- Build command:

```bash
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
```

Backend:

- Render, Railway, Fly, or similar Node host.
- Render Blueprint is prepared in `render.yaml`; do not apply it until real env values are ready.
- Start command:

```bash
pnpm --filter @workspace/api-server start
```

Database:

- Supabase Postgres or managed PostgreSQL.
- Required: set `DATABASE_URL`.
- API startup runs migration and fails fast if required tables are missing.

Uploads:

- Local development stores files on local disk.
- Production can store files in Supabase Storage when `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STORAGE_BUCKET` are set.
- If those storage env vars are missing, `/api/upload` falls back to local disk. That fallback is acceptable only on hosts with persistent disk.
- The current frontend expects public image URLs, so the storage bucket should be public unless the app is later changed to signed URLs.

## Required Environment Variables

Backend:

```text
DATABASE_URL=postgresql://...
SESSION_SECRET=<long-random-secret>
FRONTEND_ORIGIN=https://<frontend-domain>
NODE_ENV=production
PORT=8787
```

Production startup fails fast when:

- `DATABASE_URL` is missing.
- `SESSION_SECRET` is missing or still set to `change-me-in-production` / `dev-qxwap-secret`.
- `FRONTEND_ORIGIN` is missing or `*`.
- Any Supabase storage variable is set without the other required storage variables.

Optional storage variables:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STORAGE_BUCKET=qxwap
```

Frontend:

```text
API_BASE_URL=https://<backend-domain>/api
```

The frontend API base normalizer accepts both:

```text
https://example.com
https://example.com/api
```

and normalizes to one `/api` suffix.

## Deployment Gates

Run before deployment:

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
API_BASE_URL=https://<backend-domain>/api pnpm preflight:frontend
DATABASE_URL=postgresql://... SESSION_SECRET=<secret> FRONTEND_ORIGIN=https://<frontend-domain> NODE_ENV=production pnpm preflight:backend
API_BASE_URL=https://<backend-domain>/api pnpm smoke:api
BASE_PATH=/QXwap/ API_BASE=https://<backend-domain>/api pnpm check:web-dist
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

Backend smoke test after deploy:

```bash
curl --fail https://<backend-domain>/api/health
```

Expected:

```json
{
  "ok": true,
  "database": "connected",
  "required_tables": 18,
  "required_tables_expected": 18
}
```

Frontend smoke test after deploy:

- Open frontend URL.
- Confirm Feed loads products.
- Confirm no stale old UI appears.
- Confirm login works.
- Confirm Xwap opens offer sheet.
- Confirm uploaded image URLs resolve.

API smoke test after backend deploy:

```bash
API_BASE_URL=https://<backend-domain>/api pnpm smoke:api
```

The smoke script creates isolated users, uploads a tiny PNG image, creates an item, verifies search + wanted tag filtering, sends a no-product Xwap offer, and confirms the seller receives it.

## GitHub Pages Notes

Existing workflow:

```text
.github/workflows/pages.yml
```

It requires `API_BASE_URL` as a GitHub repository variable or secret. It health-checks:

```text
${API_BASE_URL}/health
```

and injects `window.API_BASE` into `index.html`.

The workflow runs `scripts/qxwap-preflight.mjs` to reject bad `API_BASE_URL`, `/api/api` duplication, localhost production API bases, failed API health, and missing required tables.
It also runs `scripts/qxwap-web-dist-check.mjs` after API injection to verify GitHub Pages asset paths and `window.API_BASE`.

## Render Blueprint Notes

Prepared file:

```text
render.yaml
```

Before applying:

- Create or choose a Supabase Postgres database.
- Create a public Supabase Storage bucket named `qxwap` or update `STORAGE_BUCKET`.
- Set `DATABASE_URL`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Keep `FRONTEND_ORIGIN` as the exact frontend HTTPS origin.
- After deploy, run `API_BASE_URL=https://<render-service>/api pnpm preflight:frontend` and `API_BASE_URL=https://<render-service>/api pnpm smoke:api`.

## Known Production Risks

- Production image storage now supports Supabase Storage, but launch still needs a real public bucket and env values.
- Backend production config now fails fast for unsafe env, but staging still needs a real env smoke test.
- Cookie settings use `SameSite=None` and `Secure=true` in production; backend must be HTTPS.
- `FRONTEND_ORIGIN` must exactly match the deployed frontend origin for session cookies.
- GitHub Pages and API must be on HTTPS for production auth to work reliably.
- Supabase clean database migration should be tested before launch day.

## Rollback

Frontend:

- Re-run the previous successful GitHub Pages/Netlify deployment artifact.
- Verify `window.API_BASE` still points to the intended backend.

Backend:

- Roll back to the previous backend release.
- Keep the database backup from before launch.
- Avoid destructive migrations until production backup exists.
