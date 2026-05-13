# 05 Deploy Next

Use this card only when the user asks for staging/production deployment planning or execution.

## Read First

```text
docs/production-deployment-plan.md
docs/staging-setup-guide.md
docs/production-action-board.md
README.md
.env.example
```

## Do Not Deploy Yet Unless User Explicitly Says

Deployment needs real choices/secrets:

- Backend host: Render/Railway/Fly/Replit/etc.
- Render Blueprint exists at `render.yaml`, but do not apply it without real env values.
- Database: Supabase Postgres or other PostgreSQL.
- Upload storage: Supabase Storage bucket. Current `/api/upload` uses it when env vars are set.
- Frontend host: GitHub Pages/Netlify/Vercel/etc.
- Production env values.

## Required Env

```text
DATABASE_URL
SESSION_SECRET
API_BASE_URL
FRONTEND_ORIGIN
NODE_ENV
PORT
```

Production API startup fails if `DATABASE_URL`, a real `SESSION_SECRET`, or explicit `FRONTEND_ORIGIN` is missing.

Optional:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STORAGE_BUCKET
```

Storage env vars are all-or-nothing. If one is set, all three must be set.

## API Base Rule

Frontend must normalize to one `/api` suffix:

- `https://example.com` -> `https://example.com/api`
- `https://example.com/api` -> `https://example.com/api`
- never `/api/api`

## Pre-Deploy Gates

```bash
pnpm gate:production
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
API_BASE_URL=https://<backend-domain>/api pnpm preflight:frontend
DATABASE_URL=postgresql://... SESSION_SECRET=<secret> FRONTEND_ORIGIN=https://<frontend-domain> NODE_ENV=production pnpm preflight:backend
API_BASE_URL=https://<backend-domain>/api pnpm smoke:api
API_BASE=https://<backend-domain>/api pnpm inject:web-api-base
BASE_PATH=/QXwap/ API_BASE=https://<backend-domain>/api pnpm check:web-dist
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

## Post-Deploy Smoke

- `/api/health` returns OK.
- Signup/signin work.
- Feed loads items.
- Upload image works.
- Uploaded image URL is a Supabase public object URL in production.
- Xwap offer works.
- Inbox offer appears.
- Frontend uses deployed API, not localhost.
- No stale service worker/cache trap.

Run `API_BASE_URL=https://<backend-domain>/api pnpm smoke:api` before frontend smoke testing.
