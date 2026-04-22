# QXwap

## Overview

Thai-language marketplace/swap platform. Mobile-first web app where users sign up, list items they own, browse a feed of swap opportunities, send offers, and accept/reject deals. Backed by a custom Express + PostgreSQL API; supports both email/password and Replit Auth.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Frontend**: Vanilla JS ES modules + Vite — `artifacts/web-app` (no React)
- **Backend**: Express 5 + Drizzle ORM + Replit Postgres — `artifacts/api-server`
- **Auth**: scrypt password hashing + cookie sessions in DB; Replit Auth via `openid-client`
- **Routing**: path-based — web at `/`, API at `/api`

## Database Schema

All tables in Replit Postgres via Drizzle (`lib/db/src/schema/`):
- `sessions` — cookie session store (id, user_id, expires_at)
- `users` — auth identities (id, email, password_hash, replit_user_id, first_name, last_name, profile_image_url)
- `profiles` — public user info (id FK users.id, username, display_name, avatar_url, city, verified_status, rating_avg, successful_deals_count)
- `items` — listings (id, owner_id, title, description, category, condition_label, deal_type enum[swap,buy,both], price_cash, price_credit, wanted_text, status enum[active,closed], location_label, image_emoji, created_at)
- `offers` — swap requests (id, target_item_id, sender_id, receiver_id, status enum[pending,accepted,rejected,canceled], offered_cash, offered_credit, message, created_at)
- `deals` — accepted swaps (id, offer_id, sender_id, receiver_id, target_item_id, stage, fulfillment_type, logistics_confirmed, created_at)

Push schema with `pnpm --filter @workspace/db run push`.

## Architecture

### Frontend (`artifacts/web-app/`)

- `index.html` — markup + CSS only; loads `/src/main.js` as a module
- `src/main.js` — boots app, wires functions to `window.QX` for inline `onclick` handlers
- `src/state.js` — shared state (currentUser, filters, categories list)
- `src/api.js` — REST client (`/api/*`) using `fetch` with `credentials: "include"`
- `src/util.js` — `qs`, `escapeHtml`, `notify`, `debugStatus`
- `src/ui/nav.js` — page switching and auth guard
- `src/ui/auth.js` — sign in / sign up / sign out / Replit login redirect
- `src/ui/items.js` — item rendering, filters, create form
- `src/ui/offers.js` — inbox + offer status updates
- `src/ui/profile.js` — profile screen

### Backend (`artifacts/api-server/`)

- `src/lib/auth.ts` — scrypt password hash/verify, session CRUD, OIDC config
- `src/middlewares/authMiddleware.ts` — loads `req.user` from `qx_sid` cookie; exports `requireAuth`
- `src/routes/auth.ts` — `POST /api/auth/{signup,signin,signout}`, `GET /api/auth/me`, Replit OIDC at `/api/auth/replit/{login,callback}`
- `src/routes/items.ts` — `GET /api/items` (filters: category, deal_type, search, owner_id), `POST /api/items` (auth)
- `src/routes/offers.ts` — `GET /api/offers`, `POST /api/offers` (auth), `PATCH /api/offers/:id` (auth; auto-creates deal on accept)
- `src/routes/profiles.ts` — `GET /api/profiles/:id`

## Auth flow

- Email/password: scrypt-hashed, session row in `sessions`, `qx_sid` httpOnly cookie.
- Replit Auth: `/api/auth/replit/login` → OIDC redirect → `/api/auth/replit/callback` links by `replit_user_id` then by email.
- Both flows call `ensureProfile()` to upsert a `profiles` row.

## Key Commands

- `pnpm --filter @workspace/web-app run dev` — frontend
- `pnpm --filter @workspace/api-server run dev` — API
- `pnpm --filter @workspace/api-server run typecheck` — TS check
- `pnpm --filter @workspace/db run push` — sync schema to DB
