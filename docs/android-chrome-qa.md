# QXwap Android Chrome QA

Use this checklist before public launch to verify the real mobile browser experience. Desktop responsive mode is not enough for final sign-off.

## 1. Network Setup

Phone and Mac must be on the same Wi-Fi.

Start API:

```bash
cd <repo-root>
PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
```

Start web:

```bash
cd <repo-root>
PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0
```

Find the phone URL:

```bash
pnpm qa:lan
```

Open the printed Web URL on Android Chrome, for example:

```text
http://192.168.x.x:5173
```

Why this works:

- Android Chrome calls the Vite web server.
- Vite proxies `/api` and `/uploads` to the API running on the Mac.
- No production secrets are needed.

## 2. Device Requirements

Test on at least one real Android phone:

- Android Chrome latest stable.
- Normal mode, not desktop site.
- 390px-ish viewport or common phone width.
- Touch scrolling with finger, not mouse.
- Real file picker for profile photo and product images.

## 3. Core Pass Criteria

### Feed

- [ ] App opens without API error.
- [ ] Feed loads once and does not visibly refresh repeatedly.
- [ ] Vertical scroll is smooth.
- [ ] No horizontal scroll.
- [ ] Product card tap opens Detail.
- [ ] Xwap tap opens login prompt for guest.
- [ ] Bottom nav does not cover Feed content.
- [ ] Guest login layer stays near bottom and does not block card scrolling.

### Login

- [ ] Sign in with `mali@qxwap.app` / `password123`.
- [ ] Feed reloads automatically after login.
- [ ] Avatar appears in top bar.
- [ ] Credit card shows on Feed.

### Shop Search / Filter

- [ ] Shop opens 2-column grid.
- [ ] Product images stay square.
- [ ] Search input filters results.
- [ ] Category rail selected state is visible.
- [ ] Filter sheet opens and does not overflow screen height.
- [ ] Apply and Clear buttons are reachable without keyboard overlap.
- [ ] Wanted tag click moves to Shop and applies search/filter.

### Product Detail

- [ ] Image renders.
- [ ] Price/credit/open offer display is readable.
- [ ] Owner panel avatar/name renders.
- [ ] Owner item shows Edit/Delete only for the owner.
- [ ] Non-owner item hides Edit/Delete and shows Xwap.
- [ ] Save/bookmark button responds.

### Add Product

- [ ] Deal type icon cards are easy to tap.
- [ ] Text fields do not zoom or overflow.
- [ ] Wanted tags can be added with `+`.
- [ ] Android file picker opens for image upload.
- [ ] Created product appears without manual refresh.
- [ ] Uploaded product image renders in Feed, Shop, and Detail.

### Xwap / Offer

- [ ] Non-owner Xwap opens Offer sheet.
- [ ] If user has items, item checkboxes are visible and tappable.
- [ ] Cash and credit inputs accept numeric values.
- [ ] Message-only offer is possible.
- [ ] Instant Swap controls are visible.
- [ ] Shipping payer select is usable.
- [ ] Submit offer succeeds.
- [ ] Inbox shows sent/received offer.

### Profile

- [ ] Profile menu tabs are easy to tap.
- [ ] User listings are only that user's items.
- [ ] Settings form is readable.
- [ ] Android file picker opens for profile photo.
- [ ] Profile photo persists after refresh.
- [ ] Profile photo persists after sign out + sign in.
- [ ] Public profile opens from owner avatar/name.

### Inbox / Shipment

- [ ] Offers tab and notifications tab are clear.
- [ ] Received offer actions are reachable.
- [ ] Accept offer works.
- [ ] Shipment controls show after accept.
- [ ] Courier proof photo placeholders do not break layout.

## 4. Capture Evidence

For each failure, capture:

```text
Device model:
Android version:
Chrome version:
URL:
User account:
Screen:
Steps:
Expected:
Actual:
Screenshot/video path:
Network request/status if visible:
```

Suggested output file:

```text
docs/android-qa-results-YYYY-MM-DD.md
```

## 5. Blockers

Block staging/public launch if any of these fail:

- Login cannot keep session.
- Feed/Shop cannot load API data.
- Product image upload fails.
- Profile photo does not persist.
- Non-owner sees Edit/Delete.
- User with no products cannot send a cash/credit/message Xwap offer.
- Search + filter combinations produce wrong items.
- Page has horizontal scroll on common Android phone width.
