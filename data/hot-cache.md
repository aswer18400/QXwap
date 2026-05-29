# Hot Cache

Updated: 2026-05-28 Asia/Bangkok

## Current Sprint

- Branch: `codex/product-readiness-loop`
- Goal: add a canonical product-readiness loop that runs every 30 minutes until noon tomorrow, scores readiness, logs seeded + dynamic bugs, and keeps re-testing local QXwap flows automatically

## What Was Added

- `playwright` added as root dev dependency
- `scripts/qxwap-product-readiness-personas.mjs`
- `scripts/qxwap-product-readiness-browser.mjs`
- `scripts/qxwap-product-readiness-loop.mjs`
- `scripts/qxwap-product-readiness-autofix.mjs`
- `scripts/qxwap-product-readiness-launchd.mjs`
- `docs/ai-context/14-product-readiness-loop-2026-05-28.md`

## Commands

```bash
pnpm product:readiness:once
pnpm product:readiness
pnpm product:readiness:autofix
pnpm product:readiness:install
pnpm product:readiness:status
pnpm product:readiness:uninstall
```

## Latest Runtime Status

- Scheduler installed via launchd
- Scheduler status: `running`
- LaunchAgent: `com.qxwap.product-readiness-loop`
- Plist: `/Users/raynee/Library/LaunchAgents/com.qxwap.product-readiness-loop.plist`
- Interval: every 1800 seconds
- Stop target: `2026-05-29T05:00:00.000Z` (`12:00 Asia/Bangkok`)

## Latest Score

- Overall: `46/100`
- Ready: `false`
- Report JSON: `/tmp/qxwap-product-readiness/latest.json`
- Report Markdown: `/tmp/qxwap-product-readiness/latest.md`

## Current Severity Summary

- blocker: `1`
- critical: `8`
- major: `6`
- minor: `1`

## Current High-Risk Themes

- post-auth onboarding / intent restoration is weak
- duplicate offer / duplicate chat protection is incomplete
- shipment schedule confirmation can regress
- accessibility blocker remains in custom widgets and keyboard contract
- session-expired recovery is not centralized
- deep-route refresh fallback is brittle
- analytics readiness is incomplete for core conversion events

## Notes

- The first run produced a false frontend blocker because the self-heal Vite command started on `5173` instead of `5174`; this was fixed in `scripts/qxwap-product-readiness-loop.mjs`
- The first launchd attempt also failed because the plist used a shell command string; this was replaced with direct Node execution in `scripts/qxwap-product-readiness-launchd.mjs`
- Fixed one blocker in-product: `AiFeed` no longer renders nested interactive controls inside the main card action
- Browser audit now waits past the splash window before scoring route render health, so the latest readiness score avoids false-critical splash timing failures
- Auto-fix queue is now active for safe issue classes; first pass resolved add-flow unlabeled controls by applying deterministic `aria-label` fixes in `AddProduct.tsx`
- `profile_edit` focus finding was traced to a splash-timing false positive in the browser audit; the harness now waits for app-ready state inside the accessibility/error sweep before pressing `Tab`
- Latest completed loop now reports `add-invalid` unlabeled controls as resolved and `profile-edit` keyboard flow as `H1 -> INPUT` after the first `Tab`, so the queue is idle until the next safe issue class appears
- Added a deterministic route-level retry state for `NotificationsPage`; latest browser audit no longer reports `Notifications server error state is not clearly recoverable`
- Product-readiness automation is now a persistent `launchd` daemon that runs `scripts/qxwap-product-readiness-loop.mjs` without `--once`; the loop sleeps internally every 30 minutes until noon and uses `loop.lock.json` to avoid overlapping worker instances
- Browser screenshots for the latest audit are stored in `/tmp/qxwap-product-readiness/screenshots`
- Canonical repo still has no checkout flow; readiness loop marks payment/checkout as `n/a`
