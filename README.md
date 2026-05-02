# QXwap

QXwap is a mobile-first swap/trade marketplace. Users can list items, specify what they want, receive and send swap offers (Xwap), chat, save items, filter/search listings, and manage their profile.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + tRPC + TanStack Query
- **Backend:** Hono + tRPC + Drizzle ORM + PostgreSQL (PGlite for local dev)
- **Auth:** Email/password sessions with cookie-based auth stored in DB
- **Database:** PostgreSQL-compatible (PGlite in dev, Supabase/Postgres in production)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm or npm

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Push database schema (PGlite)
npm run db:push

# 4. Seed test data
npx tsx db/seed.ts

# 5. Start dev server
npm run dev
```

The dev server runs at `http://localhost:3000` (frontend + backend via Vite).

### Production Build

```bash
npm run build
NODE_ENV=production node dist/boot.js
```

## Project Structure

- `src/` — Frontend React app
  - `pages/` — Route-level screens (Feed, Shop, Add, Inbox, Profile, ...)
  - `components/` — Reusable UI components and sheets (FilterSheet, OfferSheet)
  - `hooks/` — Custom hooks (useAuth)
  - `providers/` — tRPC client provider
- `api/` — Backend tRPC routers + Hono REST routes
  - `routers/` — tRPC routers (item, profile, offer, chat, wallet, ...)
  - `routes/` — Hono REST routes (auth, upload)
- `db/` — Drizzle ORM schema, relations, migrations, and seed
- `public/` — Static assets (PWA manifest, service worker, icons, uploads)

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string or PGlite data dir | `./data/pglite` |
| `SESSION_SECRET` | Secret for cookie session signing | `long-random-string` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `VITE_API_BASE` | API base path for frontend | `/api` |
| `VITE_API_URL` | Legacy frontend API base alias; fallback if `VITE_API_BASE` is unset | `https://your-backend.onrender.com/api` |
| `FRONTEND_ORIGIN` | Allowed CORS origin in production | `https://qxwap.github.io` |
| `PORT` | Production server port | `3000` |
| `R2_ACCOUNT_ID` | Cloudflare account ID for R2 upload integration | `0123456789abcdef` |
| `R2_ACCESS_KEY_ID` | R2 access key ID | `your-r2-access-key-id` |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key | `your-r2-secret-access-key` |
| `R2_BUCKET_NAME` | R2 bucket name | `qxwap-uploads` |
| `R2_ENDPOINT` | Optional custom R2 endpoint override | `https://<account>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | Optional public base URL/CDN URL for uploaded assets | `https://pub-xxx.r2.dev` |
| `VAPID_SUBJECT` | Web Push contact URI | `mailto:you@example.com` |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key | `BExamplePublicKey` |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key | `ExamplePrivateKey` |

## API Overview

### REST Endpoints (Hono)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/signup` | Register with email/password |
| POST | `/api/auth/signin` | Login |
| POST | `/api/auth/signout` | Logout |
| GET | `/api/auth/me` | Current session user |
| POST | `/api/upload` | Multipart image upload |

### tRPC Routers (mounted at `/api/trpc`)

| Router | Key Procedures |
|--------|---------------|
| `item` | `feed`, `list`, `byId`, `create`, `update`, `delete` |
| `profile` | `me`, `updateMe`, `byId` |
| `bookmark` | `list`, `create`, `delete` |
| `follow` | `list`, `create`, `delete` |
| `offer` | `list`, `sent`, `received`, `byId`, `create`, `accept`, `reject`, `cancel`, `confirm` |
| `wallet` | `get`, `transactions`, `deposit` |
| `notification` | `list`, `read` |
| `deal` | `mine`, `byId`, `updateStage`, `updateLogistics` |
| `shipment` | `start`, `byId`, `updateStep`, `finish` |
| `chat` | `conversations`, `messages`, `sendMessage`, `createConversation` |

## Deployment

### Frontend (GitHub Pages)

1. Build the frontend: `npm run build`
2. Deploy the `dist/public/` directory to GitHub Pages.
3. Inject the correct API base into `index.html`:
   ```html
   <script>window.API_BASE = "https://your-api.com/api";</script>
   ```
4. The included service worker (`public/sw.js`) clears all caches on activate to prevent stale code traps.

### Backend (Render/Railway/Fly)

1. Set `NODE_ENV=production`
2. Set `DATABASE_URL` to a real PostgreSQL connection string (e.g., Supabase).
3. Set `SESSION_SECRET` to a strong random string.
4. Set `FRONTEND_ORIGIN` to your deployed frontend URL.
5. If you enable Cloudflare R2 uploads later, set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` together.
6. If you enable Web Push later, set `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` together.
7. Start with `NODE_ENV=production node dist/boot.js`

### Database Migration (Production)

For production with a real PostgreSQL server:

1. Ensure `drizzle.config.ts` points to your PostgreSQL connection.
2. Generate migrations:
   ```bash
   npx drizzle-kit generate
   ```
3. Apply migrations:
   ```bash
   npx drizzle-kit migrate
   ```

## Mobile QA Checklist

- [x] Home loads once without repeated refreshes
- [x] Feed scroll smooth
- [x] Shop scroll smooth
- [x] Product card opens detail
- [x] Xwap opens offer flow
- [x] Offer can be sent by account with no products using message/cash/credit
- [x] Search works
- [x] Filter works
- [x] Search + filter work together
- [x] Wanted tag click filters/searches matching items
- [x] Add product UI deal type icons work
- [x] Optional price/open offers works
- [x] Wanted tags can be added with `+`
- [x] Wanted tags show on product card/detail
- [x] Login loads products without manual refresh
- [x] Posting product refreshes automatically
- [x] Existing product images show
- [x] Creating product with images works
- [x] Profile photo save persists after refresh/re-login
- [x] Owner sees Edit/Delete only on own items
- [x] Non-owner does not see Edit/Delete
- [x] GitHub Pages deployed site uses latest code/API base

## License

MIT
