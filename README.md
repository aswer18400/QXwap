# QXwap Project

QXwap is a mobile‑first Thai swap/trade marketplace PWA with a React/Vite frontend, Express API, database‑backed sessions, persistent marketplace data, uploads, offers, chat, wallet, deals, and shipment routes.

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
SESSION_SECRET=long‑random‑secret
API_BASE_URL=https://your-api.example.com/api
FRONTEND_ORIGIN=https://your-frontend.example.com
NODE_ENV=production
PORT=8787
PGLITE_DATA_DIR=.data/qxwap-pglite-local
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your‑service‑role‑key
STORAGE_BUCKET=qxwap
```

The frontend normalises `window.API_BASE` or `VITE_API_BASE` so both `https://example.com` and `https://example.com/api` become a final API base ending in `/api` without `/api/api`.

Uploads use local disk in development. If `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STORAGE_BUCKET` are set, `/api/upload` stores files in Supabase Storage and returns public object URLs. The bucket should be public for the current frontend image rendering path; switch to signed URLs later if product privacy requirements change.

In `NODE_ENV=production`, the API fails fast if the `DATABASE_URL`, a real `SESSION_SECRET`, or an explicit `FRONTEND_ORIGIN` is missing. If one Supabase storage variable is set, all three storage variables must be set together.

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
- Shipments: `POST /shipments/:offerId/start`, `GET /shipments/:offerId`, `POST /shipments/:id/update-step`, `POST /shipments:/id/finish`
- Chat: `GET /chat/conversations`, `GET /chat/conversations/:id/messages`, `POST /chat/conversations/:id/messages`

## Deployment

Backend can be deployed to Render/Railway/Fly/Replit. A Render Blueprint is available in `render.yaml`. Set `DATABASE_URL`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, `NODE_ENV=production`, and `PORT`. For production uploads on hosts without persistent disk, also set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `STORAGE_BUCKET`.

Frontend can be deployed to GitHub Pages. The included workflow requires `API_BASE_URL` as a repository variable or secret, health‑checks `${API_BASE_URL}/health`, injects `window.API_BASE`, and disables ...