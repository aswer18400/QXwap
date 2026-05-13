# QXwap Development Plan

เอกสารนี้สรุปงาน Development ที่ต้องทำให้ QXwap จากดีไซน์/prototype กลายเป็นแอปใช้งานจริง.

## 1. Development Scope

QXwap ต้องพัฒนาเป็น mobile-first marketplace / swap app ที่มี:

- Frontend / mobile web app
- Backend API
- Database
- Authentication / session
- Upload / media handling
- Offer / Xwap workflow
- Notifications
- Chat
- Wallet / credit
- Deals / shipment
- Admin panel in later phase
- External integrations in later phase
- Staging/test deployment

## 2. Current Codebase Structure

Expected source of truth:

```text
/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
```

Core paths:

```text
apps/web                  frontend
apps/api                  backend
apps/web/src              React/Vite app source
apps/api/src/server.ts    API server/routes
apps/api/src/db.ts        database/migration/seed
apps/api/src/session-store.ts
docs/                     design/prototype/handoff docs
```

## 3. Frontend / Mobile App Development

Primary target:

- Mobile-first web app / PWA
- Android Chrome first
- Compatible with Expo Go / mobile WebView later

Core screens:

- Feed
- Shop
- Add Product
- Product Detail
- Offer Sheet
- Inbox
- Notifications
- Chat
- Profile
- Public Profile
- Wallet
- Deal / Shipment Progress
- Auth Modal
- Error / Empty / Loading states

Frontend requirements:

- Use real API data, not static mock data.
- Keep API base configurable.
- No hardcoded localhost in production.
- Smooth scroll on mobile.
- No repeated refresh loops.
- No horizontal scroll at 390px.
- Product card tap opens detail.
- Xwap button opens offer flow.
- Wanted tag click applies search/filter.
- Owner/non-owner controls must be correct.
- Guest protected actions open login prompt.

Key frontend tasks:

1. Stabilize current UI against design final.
2. Map design system tokens into CSS/TS.
3. Replace prototype-only data with API calls.
4. Add API error handling across all flows.
5. Add loading/empty/error states.
6. Verify mobile 390px.
7. Prepare PWA manifest/service worker carefully to avoid stale cache.

## 4. Backend Development

Recommended stack:

- Node.js
- Express
- PostgreSQL / Supabase Postgres
- Session auth with database-backed session store
- Upload endpoint for images

Backend requirements:

- All API endpoints under `/api`.
- JSON errors must be useful.
- Invalid login returns `401`, not `500`.
- Migrations must fail fast if schema is broken.
- Sessions stored in database.
- CORS must allow configured frontend origin.

Backend task groups:

- Auth routes
- Profile routes
- Items routes
- Upload routes
- Bookmark routes
- Follow routes
- Offer routes
- Wallet routes
- Notification routes
- Chat routes
- Deal routes
- Shipment routes
- Health check

## 5. Database

Database:

- PostgreSQL
- Supabase Postgres is acceptable for production
- Local dev can use fallback only if production schema stays compatible

Required entities:

- users
- user_sessions
- profiles
- categories
- items
- item_images
- follows
- bookmarks
- offers
- offer_items
- wallets
- transactions
- notifications
- deals
- shipments
- chat_conversations
- chat_participants
- chat_messages

Database development requirements:

- Use UUID primary keys.
- Add timestamps.
- Add cascade delete where appropriate.
- Add indexes for common filters/search.
- Keep wanted tags queryable.
- Store profile/avatar/image URLs persistently.
- Do not swallow migration errors.

High-risk DB behavior:

- Profile photo persists after refresh/re-login.
- Uploaded product image URLs work local and production.
- Owner queries only return current user’s listings.
- Offer records support users with no products.
- Session records expire correctly.

## 6. API

Core endpoints:

```text
GET  /api/health
GET  /api/auth/me
POST /api/auth/signup
POST /api/auth/signin
POST /api/auth/signout
GET  /api/profiles/me
PATCH /api/profiles/me
GET  /api/profiles/:id
GET  /api/items
GET  /api/feed
GET  /api/items/:id
POST /api/items
PATCH /api/items/:id
DELETE /api/items/:id
POST /api/upload
GET  /api/bookmarks
POST /api/bookmarks
DELETE /api/bookmarks/:itemId
GET  /api/follows
POST /api/follows/:userId
DELETE /api/follows/:userId
GET  /api/offers
GET  /api/offers/sent
GET  /api/offers/received
GET  /api/offers/:id
POST /api/offers
POST /api/offers/:id/accept
POST /api/offers/:id/reject
POST /api/offers/:id/cancel
POST /api/offers/:id/confirm
GET  /api/wallet
GET  /api/transactions
POST /api/wallet/deposit
GET  /api/notifications
POST /api/notifications/read
GET  /api/deals/mine
GET  /api/deals/:id
PATCH /api/deals/:id/stage
PATCH /api/deals/:id/logistics
POST /api/shipments/:offerId/start
GET  /api/shipments/:id
POST /api/shipments/:id/update-step
POST /api/shipments/:id/finish
GET  /api/chat/conversations
GET  /api/chat/conversations/:id/messages
POST /api/chat/conversations/:id/messages
```

API query requirements for items/feed:

- `q`
- `category`
- `deal_type`
- `min_price`
- `max_price`
- `open_to_offers`
- `wanted_tag`
- `owner_id`
- `following`
- `nearby_radius_km`
- `lat`
- `lng`
- `fast_responder`
- `featured`
- `sort`

## 7. Authentication / Login System

Auth requirements:

- Email/password signup.
- Email/password signin.
- HttpOnly cookie session.
- Session stored in `user_sessions`.
- Secure cookie in production.
- SameSite configurable.
- CORS configured for frontend.

UX requirements:

- Guest can browse.
- Protected actions prompt login.
- Login returns user to intended action when possible.
- Invalid login shows clear error.

User levels:

- Level 0: Guest / not logged in
- Level 1-2: registered user
- Level 3: credit/payment-enabled user
- Level 4: restricted user, can view but cannot Xwap

Admin/CMS later controls restricted level.

## 8. Payment / Credit System

Current QXwap requirement is credit-based, not cash withdrawal.

Credit rules:

- Credits can be earned from app activity and completed swaps.
- Credits can be used to strengthen offers.
- Credits cannot be withdrawn or exchanged for cash.
- Credits can be used for second-hand/reward items from system later.

Development phases:

### Phase 1

- Wallet table
- Transactions table
- Credit balance display
- Manual/test deposit endpoint
- Credit amount on offer

### Phase 2

- Payment provider integration if needed
- Payment webhook handling
- Fraud/chargeback handling
- Admin credit adjustment tools

Possible providers:

- Stripe
- Omise
- PromptPay provider

Do not implement real payment until product rules are approved.

## 9. Notifications

Notification events:

- New offer received
- Offer accepted/rejected/cancelled/confirmed
- New chat message
- Shipment status update
- Product saved/requested
- Credit transaction

Implementation options:

- Phase 1: polling `/api/notifications`
- Phase 2: SSE `/api/events`
- Phase 3: push notifications / PWA push

Notification UI:

- Bell icon badge
- Inbox tabs: offers / notifications
- Read/unread status

## 10. Admin Panel

Admin panel is later phase.

Admin capabilities:

- Manage users
- Set user level / restricted status
- Review reports
- Moderate items/images
- Manage categories
- Manage featured/good users
- Adjust credits
- Review offers/deals/shipments
- View audit logs

Do not block marketplace MVP on full admin panel, but prepare fields:

- `profiles.account_level`
- `profiles.is_featured`
- `profiles.is_fast_responder`
- item status
- report/moderation fields later

## 11. External Integrations

Potential integrations:

### Maps / Location

- Nearby filter
- Distance radius
- Pickup/dropoff estimation
- Store lat/lng on profile/items

Possible providers:

- Google Maps
- Mapbox
- OpenStreetMap/Nominatim

### Email

- Signup/login verification later
- Offer notification emails
- Admin emails

Possible providers:

- Resend
- SendGrid
- Postmark

### SMS / OTP

- Phone verification later
- Shipment/contact verification

Possible providers:

- Twilio
- Thai SMS provider

### Storage

- Supabase Storage
- S3-compatible object storage
- Local upload only for dev

## 12. Deploy Test System

Recommended environments:

### Frontend

- GitHub Pages
- Netlify
- Vercel

### Backend

- Render
- Railway
- Fly.io
- Replit

### Database

- Supabase Postgres
- Neon Postgres
- Render Postgres

Environment variables:

```text
DATABASE_URL
SESSION_SECRET
API_BASE_URL
FRONTEND_ORIGIN
NODE_ENV
PORT
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STORAGE_BUCKET
```

Deployment requirements:

- Frontend API base normalized to `/api`.
- Avoid `/api/api`.
- Health check backend before deploy final.
- Stale service worker/cache must not trap old code.
- Production cookies must be secure and CORS-compatible.

## 13. Development Phases

### Phase 0: Stabilize

- Restore working DB/API if broken.
- Run typecheck/tests.
- Verify auth/session.
- Verify images/upload.

### Phase 1: MVP Marketplace

- Feed
- Shop
- Product detail
- Add/edit/delete product
- Search/filter
- Wanted tags
- Save/bookmark
- Profile

### Phase 2: Xwap Flow

- Offer sheet
- Sent/received offers
- User without products can offer
- Accept/reject/cancel/confirm
- Notifications

### Phase 3: Credit + Chat + Shipment

- Wallet/transactions
- Credit offer
- Chat
- Shipment steps
- Pickup/delivery proof

### Phase 4: Admin + External Integrations

- Admin panel
- Maps
- Email
- SMS
- Payment provider if needed
- Push notifications

### Phase 5: Production QA

- Mobile QA
- Security check
- Load/error testing
- Deployment verification

## 14. Required Test Commands

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

## 15. QA Checklist

- [ ] App loads.
- [ ] Database persists data.
- [ ] API health works.
- [ ] Signup/signin/signout works.
- [ ] Invalid login returns 401.
- [ ] Feed loads after login without manual refresh.
- [ ] Shop search/filter works.
- [ ] Product card opens detail.
- [ ] Upload image works.
- [ ] Images display in Feed/Shop/Detail.
- [ ] Add product refreshes lists.
- [ ] Wanted tag click filters.
- [ ] Xwap opens offer sheet.
- [ ] User with no products can offer.
- [ ] Offer status updates.
- [ ] Inbox shows sent/received offers.
- [ ] Profile photo persists.
- [ ] Owner sees Edit/Delete only on own items.
- [ ] Non-owner does not see Edit/Delete.
- [ ] Credits display and transactions persist.
- [ ] Notifications show new offer.
- [ ] Chat messages persist.
- [ ] Shipment flow updates.
- [ ] Mobile 390px has no horizontal scroll.
- [ ] Bottom nav does not block content.
- [ ] Production API base is correct.

## 16. Implementation Backlog

| Story | Priority | Description | Acceptance |
| --- | --- | --- | --- |
| AUTH-01 | P0 | Guest can signup/signin and return to intended action | session cookie works, invalid login returns visible 401 |
| ITEM-01 | P0 | User can browse real Feed/Shop items and open detail | real API data, images render, card tap works |
| ITEM-02 | P1 | Seller can create/edit/delete own item | upload works, wanted tags persist, owner-only controls |
| OFFER-01 | P1 | Buyer can send Xwap offer with item/cash/credit/message | no-product user can offer, owner gets notification |
| PROFILE-01 | P1 | User can edit profile/avatar and view public profiles | avatar persists, public profile shop works |
| WALLET-01 | P2 | Credit user can view and use credits in offer | ledger persists, no cash withdrawal path |
| CHAT-01 | P3 | Matched users can chat after accepted offer | messages persist by conversation |
| SHIP-01 | P3 | Shipment progresses with pickup/delivery proof | proof steps required before completion |
| ADMIN-01 | P5 | Admin can restrict users through CMS fields | level 4 blocks UI and API offer actions |

## 17. Data Model Summary

| Area | Tables / Fields | Used By |
| --- | --- | --- |
| Identity | users, user_sessions, profiles | auth, profile, user levels |
| Marketplace | items, item_images, categories, wanted_tags | Feed, Shop, Detail, Add |
| Social | bookmarks, follows, notifications | Save, follow rail, notification badge |
| Xwap | offers, offer_items, deals | offer sheet, inbox, deal progress |
| Fulfillment | chat_conversations, chat_messages, shipments | chat, pickup/delivery proof |
| Credit | wallets, transactions | wallet, credit offer, credit ledger |
| Governance | account_level, item_status, future audit logs | restricted users, moderation |
| Media | upload URLs, avatar_url, proof images | product images, profile photo, shipment proof |
