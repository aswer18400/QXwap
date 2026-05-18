# 01 Runbook

Use this card when the task is to run, test, or reproduce locally.

## Install

```bash
pnpm install
```

## Start API

```bash
PGLITE_DATA_DIR=.data/qxwap-pglite-parity pnpm --filter @workspace/api-server dev
```

If that PGlite directory aborts, keep it intact and use a fresh QA dir:

```bash
PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
```

If port `8787` is already an older API instance, run the current API on the QA smoke port:

```bash
PORT=8791 PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
```

Health:

```bash
curl -s http://localhost:8787/api/health
```

## Start Web

```bash
PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0
```

Open:

```text
http://localhost:5173
```

For Android Chrome on the same Wi-Fi:

```bash
pnpm qa:lan
```

Then open the printed Web URL on the phone.

## Figma/Design Package

The active no-cost Figma import path is the SVG kit, not the old HTML prototype files:

```text
docs/figma-free-import-kit/qxwap-free-figma-import-board.svg
docs/figma-free-import-kit/README.md
```

Drag the SVG into Figma, then follow the README naming/cleanup steps.

## Checks By Scope

Frontend:

```bash
pnpm run typecheck
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
```

Backend:

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
pnpm smoke:api:qa
```

Full:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

## Browser QA Minimum

At 390px mobile width:

- Feed loads once.
- No horizontal scroll.
- Product image appears.
- Product card opens detail.
- Xwap opens offer sheet.
- Wanted tag applies filter.
- Bottom nav does not cover content.
