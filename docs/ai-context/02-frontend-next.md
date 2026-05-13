# 02 Frontend Next

Use this card for UI bugs, mobile UX, Feed, Shop, Profile, Inbox, Auth, Offer, or design-token adoption.

## Read Only What You Need

Main shell/state:

```text
apps/web/src/App.tsx
```

Common types/API:

```text
apps/web/src/lib/types.ts
apps/web/src/lib/api.ts
apps/web/src/lib/format.ts
apps/web/src/lib/constants.ts
```

Target screens:

```text
apps/web/src/screens/AiFeed.tsx
apps/web/src/screens/ShopPage.tsx
apps/web/src/screens/Detail.tsx
apps/web/src/screens/AddProduct.tsx
apps/web/src/screens/InboxPage.tsx
apps/web/src/screens/Profile.tsx
apps/web/src/screens/ProfileShop.tsx
apps/web/src/screens/WalletPage.tsx
```

Target sheets:

```text
apps/web/src/sheets/OfferSheet.tsx
apps/web/src/sheets/FilterSheet.tsx
apps/web/src/sheets/AuthModal.tsx
apps/web/src/sheets/SearchSheet.tsx
```

CSS is split by purpose:

```text
apps/web/src/styles/feed.css
apps/web/src/styles/shop.css
apps/web/src/styles/detail.css
apps/web/src/styles/profile.css
apps/web/src/styles/inbox.css
apps/web/src/styles/auth.css
apps/web/src/styles/buttons.css
apps/web/src/styles/sheet.css
apps/web/src/styles/layout.css
```

## Recent Frontend Fixes

- `AiFeed.tsx`: followed users are prioritized, but non-following/newly posted items still show.
- `AuthNudge.tsx` + `auth.css` + `layout.css`: guest login layer sits near bottom and avoids card/action overlap.
- `InboxPage.tsx`: supports flat/nested offer data and Instant Swap shipment actions.
- `index.html` + `public/favicon.svg`: favicon added.

## Known Pending UI Bugs

- Feed product card readability at 390px still needs design polish.
- Card height/scroll smoothness should be checked after any Feed layout change.
- Guest vs logged-in layout separation needs QA after AuthNudge edits.
- Do not re-break product visibility after Feed UI edits.

## Rules

- Minimal patch first.
- Do not change backend for frontend-only work.
- Do not rewrite all UI.
- Do not move components unless the user asks.
- Keep existing state/API helpers.
- Preserve upload, auth/session, offer flow, and image path compatibility.

## Verification

```bash
pnpm run typecheck
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" apps/web docs || true
git diff --check
```

Manual:

- Feed at `http://localhost:5173`.
- 390px mobile viewport.
- No horizontal scroll.
- Card tap opens detail.
- Xwap opens offer sheet.
- Wanted tag goes to Shop/filter.
