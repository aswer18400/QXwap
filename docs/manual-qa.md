# QXwap Manual Mobile QA

- [ ] Home loads once and does not refresh repeatedly.
- [ ] Feed shows AI swap recommendations with left side as "ของที่คุณมี" and right side as "อยากได้".
- [ ] Feed top controls show followed-user avatars instead of category filters.
- [ ] Feed shows QXwap Credit / Manu Credit card and no product-page credit card.
- [ ] Feed scroll is smooth on Android Chrome sized viewport.
- [ ] Shop scroll is smooth.
- [ ] Shop shows search, category rail, filter button, and 2-column product grid.
- [ ] Shop product images are square 1:1.
- [ ] Shop cards show condition percentage and wanted product preview/placeholder.
- [ ] Product card opens detail.
- [ ] Xwap opens offer flow.
- [ ] Xwap offer flow includes Instant Swap, pickup window, courier photo requirement, and shipping/pickup fee responsibility.
- [ ] Rejected offers can include a rejection reason.
- [ ] Offer can be sent by an account with no products using message, cash, and credit.
- [ ] Search works.
- [ ] Filter works.
- [ ] Search and filter work together.
- [ ] Wanted tag click filters matching items.
- [ ] Add product deal type icon cards work.
- [ ] Optional price and open offers display correctly.
- [ ] Wanted tags can be added with `+`.
- [ ] Wanted tags show on product card and detail.
- [ ] Login loads products without manual refresh.
- [ ] Posting product refreshes automatically and opens detail.
- [ ] Existing product images show.
- [ ] Creating product with images works.
- [ ] Profile photo save persists after refresh and re-login.
- [ ] Owner sees Edit/Delete only on own items.
- [ ] Non-owner does not see Edit/Delete.
- [ ] GitHub Pages deployed site uses latest code and API base.

## Current Local QA Result

Last updated: 2026-05-13 local run on `http://localhost:5173` with API on `http://localhost:8787`.

Passed in local automated/browser QA:

- [x] Home/Feed loads with real API data.
- [x] Feed product cards render; latest check showed 7 cards after posting test items.
- [x] Mobile 390px has no horizontal scroll.
- [x] Existing product images render.
- [x] Product card tap opens detail.
- [x] Xwap opens login prompt for guest.
- [x] Login loads products without manual refresh.
- [x] Wanted tag click moves to Shop and applies search/filter.
- [x] Posting product from frontend opens detail and refreshes Feed/Shop.
- [x] Account with no products can send Xwap using message + cash + credit.
- [x] Inbox shows received offer with sender/owner profile rows and action buttons.
- [x] Accepting an offer exposes Instant Swap shipment controls.
- [x] Starting shipment creates tracking/status UI.
- [x] API health reports all required tables.
- [x] Invalid login returns `401`.
- [x] API upload local fallback still passes automated persistence test.
- [x] API build passes after adding Supabase Storage upload support.
- [x] Profile avatar persists through API upload, profile save, signout, and re-login in automated test.
- [x] Owner-only item edit/delete is enforced by API; owner/non-owner/guest `viewer.is_owner` is covered.
- [x] Search/filter API combines q, category, condition, deal type, wanted tag, price range, open offers, and sort.
- [x] Production runtime config fails fast for missing/unsafe env and incomplete storage env.
- [x] Frontend Feed reloads normally after API server is running.
- [x] Frontend login with seed account refreshes Feed without manual browser refresh.
- [x] Frontend owner item detail shows Edit/Delete.
- [x] Frontend non-owner item detail hides Edit/Delete and shows Xwap.
- [x] Frontend Xwap opens offer sheet with my items, cash, credit, Instant Swap, shipping payer, and pickup window.
- [x] Frontend wanted tag click moves to Shop and applies query + wanted tag filter.
- [x] Frontend profile display name save persists after reload.
- [x] Frontend profile photo file-picker upload persists after reload.
- [x] Frontend deploy preflight passes against local API health.
- [x] Frontend deploy preflight rejects `/api/api`, localhost production API, and non-HTTPS production API.
- [x] Backend deploy preflight rejects missing database, wildcard origin, and dev session secret.
- [x] API smoke script passes locally: health, signup/session, PNG upload, create item, search/filter, no-product Xwap offer, received offer.
- [x] API production `start` script points to built `dist/src/server.js` and serves `/api/health`.
- [x] GitHub Pages-style web build uses `BASE_PATH` for favicon, JS, and CSS assets.
- [x] Web dist check verifies built asset paths and injected `window.API_BASE`.
- [x] Shared web API-base injection script `pnpm inject:web-api-base` works before GitHub Pages dist check.
- [x] One-command local production gate `pnpm gate:production` passes.
- [x] Android LAN helper `pnpm qa:lan` prints phone-ready Web/API URLs.
- [x] Staging env template exists at `.env.staging.example`.
- [x] Session secret helper `pnpm -s secret:session` generates a 64-character base64url secret by default.

Evidence screenshots:

```text
docs/qa-final-feed-mobile-390.png
docs/qa-inbox-offer-mobile-390.png
docs/qa-shipment-flow-mobile-390.png
```

Automated commands passed:

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

Additional backend-only check on 2026-05-13:

```bash
pnpm --filter @workspace/api-server build
pnpm --filter @workspace/api-server test
pnpm run typecheck
rg -n "^<<<<<<<|^=======|^>>>>>>>" apps docs AI_START_HERE.md README.md .env.example || true
```

API tests now include 10 passing tests, including profile avatar persistence, owner-only item edit/delete, combined search/filter coverage, request-id/version behavior, and production runtime config validation.

Preflight checks verified on 2026-05-13:

```bash
API_BASE_URL=http://localhost:8787/api node scripts/qxwap-preflight.mjs --target=frontend --health
API_BASE_URL=http://localhost:8787/api/api node scripts/qxwap-preflight.mjs --target=frontend --production
NODE_ENV=production SESSION_SECRET=change-me-in-production FRONTEND_ORIGIN='*' node scripts/qxwap-preflight.mjs --target=backend --production
DATABASE_URL=postgresql://user:pass@example.com:5432/qxwap SESSION_SECRET=a-long-random-production-secret FRONTEND_ORIGIN=https://qxwap.example.com NODE_ENV=production pnpm preflight:backend
API_BASE_URL=http://localhost:8787/api pnpm smoke:api
PORT=8791 PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
pnpm smoke:api:qa
PORT=8799 PGLITE_DATA_DIR=.data/qxwap-start-check pnpm --filter @workspace/api-server start
PORT=4173 BASE_PATH=/QXwap/ pnpm --filter @workspace/web-app build
API_BASE=https://qxwap-api.example.com/api pnpm inject:web-api-base
BASE_PATH=/QXwap/ API_BASE=https://api.example.com/api pnpm check:web-dist
```

Frontend browser QA note on 2026-05-13:

- `PGLITE_DATA_DIR=.data/qxwap-pglite-parity` failed to start with a PGlite runtime abort in this local workspace.
- A fresh non-destructive QA data dir worked:

```bash
PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
```

- The in-app browser automation surface could not attach a file to `<input type="file">`, so file-picker QA was completed with direct Playwright + system Chrome instead.
- Follow-up Playwright QA with system Chrome verified profile photo file-picker upload:
  - Uploaded avatar URL persisted as `/uploads/...`.
  - Profile display name persisted after reload.
  - 390px viewport had no horizontal overflow.
  - No console errors were captured.

Evidence screenshot:

```text
docs/qa-profile-photo-ui-390.png
```

Still needs broader manual QA before public launch:

- Android Chrome device scroll/touch QA.
- Profile photo file-picker upload on a real Android Chrome device.
- Owner vs non-owner Edit/Delete verification through the actual frontend UI across two real sessions.
- Search + every filter combination through the actual frontend UI.
- Production deployment smoke test with real `API_BASE_URL`, cookies, CORS, and Supabase Storage env.
- Supabase/Postgres production migration on a clean database.

Android real-device checklist:

```text
docs/android-chrome-qa.md
```

LAN helper:

```bash
pnpm qa:lan
```
