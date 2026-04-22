# QXwap

## Overview

Thai-language marketplace/swap platform. Mobile-first web app where users sign
up, list items they own, browse a feed of swap opportunities, send offers, and
accept/reject deals. Backed by a custom Express + PostgreSQL API; supports both
email/password and Replit Auth.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Frontend**: Vanilla JS ES modules + Vite — `artifacts/web-app` (no React)
- **Backend**: Express 5 + Drizzle ORM + Replit Postgres — `artifacts/api-server`
- **Auth**: bcryptjs password hashing + `express-session` with
  `connect-pg-simple` (table `user_sessions`); Replit Auth via `openid-client`
- **Routing**: path-based — web at `/`, API at `/api`. Vite dev server also
  proxies `/api` to the api-server (default `http://localhost:8080`, override
  via `API_SERVER_URL`).

## Database Schema

All tables in Replit Postgres via Drizzle (`lib/db/src/schema/`). ID columns
are stored as `varchar` defaulted to `gen_random_uuid()` — this is the existing
shape and must not be changed to native `uuid` (would generate destructive
ALTER TABLE statements):

- `user_sessions` — express-session store (sid, sess JSON, expire). Managed
  by connect-pg-simple but defined in Drizzle schema so a fresh DB push
  creates it.
- `users` — auth identities (id, email unique, password_hash nullable,
  replit_user_id unique nullable, first_name, last_name, profile_image_url,
  created_at, updated_at).
- `profiles` — public user info (id FK users.id, username, display_name,
  avatar_url, city, verified_status, rating_avg, successful_deals_count,
  created_at).
- `items` — listings (id, owner_id FK users.id, title, description, category,
  condition_label, deal_type pgEnum[swap,buy,both], price_cash, price_credit,
  wanted_text, status pgEnum[active,paused,closed], location_label,
  image_emoji, created_at).
- `offers` — swap requests (id, target_item_id FK items.id, sender_id,
  receiver_id, status pgEnum[pending,accepted,rejected,canceled],
  offered_cash, offered_credit, message, created_at).
- `deals` — accepted swaps (id, offer_id FK offers.id, sender_id, receiver_id,
  target_item_id, stage, fulfillment_type, logistics_confirmed, created_at).

Push schema with `pnpm --filter @workspace/db run push` (or `push-force`).

## Architecture

### Frontend (`artifacts/web-app/`)

- `index.html` — verbatim head/body of `attached_assets/qxwap-single-file_*.html`
  with the inline `<script>` and Supabase CDN removed and a single
  `<script type="module" src="/src/main.js">` plus a "เข้าใช้ด้วย Replit"
  button added. All `onclick="signIn()"` style handlers are kept; `main.js`
  attaches the imported functions onto `window` so the inline contract works
  unchanged.
- `src/main.js` — boots app, wires functions to `window`.
- `src/state.js` — shared state (currentUser, filters, categories list).
- `src/api.js` — REST client (`/api/*`) using `fetch` with
  `credentials: "include"`.
- `src/util.js` — `qs`, `escapeHtml`, `notify`, `debugStatus`, `itemEmoji`.
- `src/ui/nav.js` — page switching and `authGuard`.
- `src/ui/auth.js` — `signIn`, `signUp`, `signOut`, `signInWithReplit`,
  `loadSession`.
- `src/ui/feed.js` — `loadFeed`, `setFeedFilter`, re-exports `feedCardHtml`.
- `src/ui/shop.js` — `loadShop`, `setShopFilter`, `setCategory`,
  `renderCategories`, re-exports `productCardHtml`.
- `src/ui/add.js` — `createItem`, `resetListingForm`.
- `src/ui/inbox.js` — `loadInbox`, `setInboxFilter`, `updateOfferStatus`.
- `src/ui/profile.js` — `loadProfile`.
- `src/ui/cards.js` — shared `productCardHtml`, `feedCardHtml`,
  `bindCardActions`, `openOfferPrompt` helpers.

### Backend (`artifacts/api-server/`)

- `src/lib/auth.ts` — bcryptjs `hashPassword`/`verifyPassword`, `ensureProfile`,
  lazy OIDC config.
- `src/middlewares/authMiddleware.ts` — loads `req.user` from
  `req.session.userId`; exports `requireAuth`.
- `src/app.ts` — registers cookie-parser, `express-session` with
  `connect-pg-simple` store on table `user_sessions`, cookie name `qx_sid`,
  `secure: NODE_ENV === 'production'`, secret from `SESSION_SECRET`.
- `src/routes/auth.ts` — `POST /api/auth/{signup,signin,signout}`,
  `GET /api/auth/me`, Replit OIDC at `/api/auth/replit/{login,callback}`
  (links by `replit_user_id` then by email).
- `src/routes/items.ts` — `GET /api/items` (filters: category, deal_type,
  search, owner_id), `POST /api/items` (auth).
- `src/routes/offers.ts` — `GET /api/offers/mine`, `POST /api/offers` (auth),
  `PATCH /api/offers/:id` (auth, with state guard returning 409 if not
  pending; auto-creates a `deals` row on accept).
- `src/routes/profiles.ts` — `GET /api/profiles/me` (auto-creates if missing
  via `ensureProfile`), `GET /api/profiles/:id`.

## Auth flow

- Email/password: bcryptjs hash; on success `req.session.regenerate` then
  `req.session.userId = user.id`. Cookie is `qx_sid` httpOnly,
  `sameSite=lax`, `secure` only in production.
- Replit Auth: `/api/auth/replit/login` issues PKCE+state cookies and
  redirects to OIDC; callback exchanges the code, upserts the user by
  `replit_user_id` (or links by email), calls `ensureProfile`, then logs the
  user in via the same session-regenerate path.
- CORS: when `CORS_ORIGIN` env var is set it is used as a comma-separated
  allowlist; otherwise the request origin is reflected (dev-only convenience).

## Key Commands

- `pnpm --filter @workspace/web-app run dev` — frontend
- `pnpm --filter @workspace/api-server run dev` — API
- `pnpm --filter @workspace/api-server run typecheck` — TS check
- `pnpm --filter @workspace/db run push` — sync schema to DB

## Required env vars

- `DATABASE_URL` — Replit Postgres
- `SESSION_SECRET` — express-session secret
- `REPL_ID` — required for Replit Auth OIDC
- `PORT`, `BASE_PATH` — set automatically by Replit per artifact
- `API_SERVER_URL` — optional; overrides Vite dev `/api` proxy target
- `CORS_ORIGIN` — optional; comma-separated allowlist
