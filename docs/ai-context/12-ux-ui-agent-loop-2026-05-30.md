# 12 UX/UI Agent Loop 2026-05-30

## Goal

Keep the canonical repo running a continuous UX/UI readiness loop every 10 minutes until noon Bangkok time on 2026-05-31, starting immediately from the current branch.

## What This Sprint Added

- Restored the product-readiness scripts into the canonical repo.
- Converted the readiness personas into 6 named lanes:
  - `ux-1`: first-time user
  - `ux-2`: power user
  - `ux-3`: mobile user
  - `ui-1`: accessibility user
  - `ui-2`: edge-case user
  - `ui-3`: visual consistency reviewer
- Extended browser journeys to cover:
  - `/login`
  - `/signup`
  - authenticated `search`
  - authenticated `filter`
  - authenticated `add`
  - authenticated `profile_edit`
  - authenticated `notifications`
  - authenticated `chat`
  - authenticated `offer_detail`
  - logout recovery
- Added `product:readiness:*` package scripts plus Playwright dependency.
- Added cross-tab session sync in the web app so auth changes reload sibling tabs.

## Automation Runtime

- Launch agent label: `com.qxwap.product-readiness-loop`
- Interval: `600000ms` (`10 minutes`)
- Stop time: `2026-05-31T05:00:00Z` (`2026-05-31 12:00 Asia/Bangkok`)
- Status commands:
  - `pnpm product:readiness:status`
  - `pnpm product:readiness:status-json`
  - `pnpm product:readiness:dashboard`

## Current Behavior

- The loop runs:
  - `typecheck`
  - `test`
  - `build`
  - `smoke:api`
  - `smoke:full`
  - `browser-audit`
- Browser audit now normalizes whitespace before matching auth and chat journey content.
- Splash handling waits until the app clears its loading shell instead of sampling too early.

## Files Touched

- `apps/web/src/App.tsx`
- `apps/web/src/screens/AddProduct.tsx`
- `scripts/qxwap-product-readiness-autofix.mjs`
- `scripts/qxwap-product-readiness-browser.mjs`
- `scripts/qxwap-product-readiness-launchd.mjs`
- `scripts/qxwap-product-readiness-loop.mjs`
- `scripts/qxwap-product-readiness-personas.mjs`
- `scripts/qxwap-product-readiness-status.mjs`
- `package.json`

## Operational Notes

- Canonical frontend for active QA is `http://127.0.0.1:5174/`.
- Canonical API for active QA is `http://127.0.0.1:8787/api`.
- Ignore unrelated local untracked items:
  - `.DS_Store`
  - `exports/`
  - `redesign-package/`

## Next Follow-up

- Keep burning down blocker/critical findings from the generated report.
- If the loop stalls, check:
  - `/tmp/qxwap-product-readiness/status.json`
  - `/tmp/qxwap-product-readiness/latest.json`
  - `/tmp/qxwap-product-readiness-launchd.out`
