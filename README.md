# QXwap

QXwap is a mobile-first Thai swap/trade marketplace PWA with a React/Vite frontend, Express API, database-backed sessions, persistent marketplace data, uploads, offers, chat, wallet, deals, and shipment routes.

## Quick Start

```bash
pnpm install
pnpm --filter @workspace/api-server dev
pnpm --filter @workspace/web-app dev
```

Local API runs on `http://localhost:8787/api`; Vite proxies `/api` and `/uploads`.

Seed accounts:

- `mali@qxwap.app` / `password123`
- `niran@qxwap.app` / `password123`
- `ploy@qxwap.app` / `password123`

If `DATABASE_URL` is set, the API uses PostgreSQL/Supabase Postgres. If it is absent, it uses a persistent local PGlite database in `.data/qxwap-pglite-local` so development still has real persistence. You can override the local database path with `PGLITE_DATA_DIR`.

## Environment

Copy `.env.example` and configure:

```bash
DATABASE_URL=postgresql://...
SESSION_SECRET=long-random-secret
API_BASE_URL=https://your-api.example.com/api
FRONTEND_ORIGIN=https://your-frontend.example.com
NODE_ENV=production
PORT=8787
PGLITE_DATA_DIR=.data/qxwap-pglite-local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STORAGE_BUCKET=qxwap
```

The frontend normalizes `window.API_BASE` or `VITE_API_BASE` so both `https://example.com` and `https://example.com/api` become a final API base ending in `/api` without `/api/api`.

Uploads use local disk in development. If `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STORAGE_BUCKET` are set, `/api/upload` stores files in Supabase Storage and returns public object URLs. The bucket should be public for the current frontend image rendering path; switch to signed URLs later if product privacy requirements change.

In `NODE_ENV=production`, the API fails fast if `DATABASE_URL`, a real `SESSION_SECRET`, or an explicit `FRONTEND_ORIGIN` is missing. If one Supabase storage variable is set, all three storage variables must be set together.

## API Routes

All routes are prefixed with `/api`.

- Health: `GET /health`
- Auth: `GET /auth/me`, `POST /auth/signup`, `POST /auth/signin`, `POST /auth/signout`, `GET /auth/replit/login`
- Profiles: `GET /profiles/me`, `PATCH /profiles/me`, `GET /profiles/:id`
- Items: `GET /items`, `GET /feed`, `GET /items/:id`, `POST /items`, `PATCH /items/:id`, `DELETE /items/:id`
- Uploads: `POST /upload`
- Bookmarks: `GET /bookmarks`, `POST /bookmarks`, `DELETE /bookmarks/:id`
- Follows: `GET /follows`, `POST /follows/:id`, `DELETE /follows/:id`
- Offers: `GET /offers`, `GET /offers/sent`, `GET /offers/received`, `GET /offers/:id`, `POST /offers`, `POST /offers/:id/accept`, `POST /offers/:id/reject`, `POST /offers/:id/cancel`, `POST /offers/:id/confirm`
- Wallet: `GET /wallet`, `GET /transactions`, `POST /wallet/deposit`
- Notifications: `GET /notifications`, `POST /notifications/read`
- Deals: `GET /deals/mine`, `GET /deals/:id`, `PATCH /deals/:id/stage`, `PATCH /deals/:id/logistics`
- Shipments: `POST /shipments/:offerId/start`, `GET /shipments/:offerId`, `POST /shipments/:id/update-step`, `POST /shipments/:id/finish`
- Chat: `GET /chat/conversations`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages`

## Deployment

Backend can be deployed to Render/Railway/Fly/Replit. A Render Blueprint is available in `render.yaml`. Set `DATABASE_URL`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `NODE_ENV=production`, and `PORT`. For production uploads on hosts without persistent disk, also set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STORAGE_BUCKET`.

Use `.env.staging.example` as the staging env checklist. Generate a strong session secret with `pnpm secret:session`.

Frontend can be deployed to GitHub Pages. The included workflow requires `API_BASE_URL` as a repository variable or secret, health-checks `${API_BASE_URL}/health`, injects `window.API_BASE`, and disables stale service-worker trapping by not registering a service worker.

Preflight checks:

```bash
API_BASE_URL=https://your-api.example.com/api pnpm preflight:frontend
DATABASE_URL=postgresql://... SESSION_SECRET=... FRONTEND_ORIGIN=https://your-frontend.example.com NODE_ENV=production pnpm preflight:backend
API_BASE_URL=https://your-api.example.com/api pnpm smoke:api
API_BASE=https://your-api.example.com/api pnpm inject:web-api-base
```

The frontend preflight normalizes `API_BASE_URL`, rejects `/api/api`, rejects localhost in production, and verifies `/api/health`.
The API smoke test creates isolated test users, uploads a tiny PNG image, creates an item, verifies search/filter, and sends a no-product Xwap offer.
The API injection script writes the normalized API base into `apps/web/dist/index.html` before the dist check and GitHub Pages deploy.
The web dist check verifies GitHub Pages asset paths use `BASE_PATH` and `window.API_BASE` was injected.

Rollback: redeploy the previous successful GitHub Pages artifact and backend release. Because `window.API_BASE` is injected into `index.html`, verify it points to the rollback API before publishing.

## Verification

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server test
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
API_BASE_URL=https://your-api.example.com/api pnpm preflight:frontend
API_BASE_URL=https://your-api.example.com/api pnpm smoke:api
BASE_PATH=/QXwap/ API_BASE=https://your-api.example.com/api pnpm check:web-dist
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

Manual mobile QA checklist lives in [docs/manual-qa.md](docs/manual-qa.md).
Android Chrome real-device QA lives in [docs/android-chrome-qa.md](docs/android-chrome-qa.md). Run `pnpm qa:lan` to print LAN URLs for a phone on the same Wi-Fi.

Feature parity handoff notes for comparing the local monorepo with the older GitHub QXwap app live in [docs/feature-parity.md](docs/feature-parity.md).

Staging setup notes live in [docs/staging-setup-guide.md](docs/staging-setup-guide.md).

Production design system files live in [apps/web/src/design-system](apps/web/src/design-system). Start with [apps/web/src/design-system/README.md](apps/web/src/design-system/README.md), then use `tokens.json`, `qxwap-design-tokens.css`, `qxwap-components.css`, and `qxwap-tailwind-preset.js`.
