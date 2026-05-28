# QXwap Hourly UX Watch

This sprint adds a persistent hourly watch loop for the QXwap web + API stack.

## Command

```bash
pnpm watch:ux:hourly
```

Run one cycle only:

```bash
node scripts/qxwap-hourly-ux-watch.mjs --once
```

## Default Behavior

- checks PR `#221` release readiness
- checks local frontend shell routes on `http://127.0.0.1:5174/`
- runs `pnpm smoke:api` against `http://127.0.0.1:8787/api`
- runs `pnpm smoke:full` against the same local API
- runs `pnpm typecheck`, `pnpm test`, and `pnpm build`
- if local API/frontend are down, attempts to start them automatically
- if `#221` is merged later and `UX_WATCH_TRIGGER_DEPLOY=true`, it can trigger `deploy-render.yml`
- if `#221` is merged, it also runs `pnpm smoke:release` against production

## Five UX Lanes

1. `UX Agent 1 - Release Gate`
   - watches PR `#221`
   - verifies draft state, merge readiness, and Netlify blockers

2. `UX Agent 2 - Frontend Shell`
   - checks `home`, `shop`, `notifications`, `profile_edit`, `add`, `chat`, `offer_detail`
   - ensures route shells return HTML and not dead/404 content

3. `UX Agent 3 - API Contract`
   - runs `pnpm smoke:api`

4. `UX Agent 4 - Journey Flow`
   - runs `pnpm smoke:full`

5. `UX Agent 5 - Build & Production`
   - runs `pnpm typecheck`
   - runs `pnpm test`
   - runs `pnpm build`
   - after merge, runs production smoke and can trigger deploy workflow

## Local Files

The watch writes local state outside the repo:

- `/tmp/qxwap-hourly-ux-watch.log`
- `/tmp/qxwap-hourly-ux-watch-latest.json`
- `/tmp/qxwap-hourly-ux-watch.state.json`
- `/tmp/qxwap-local-api.pid`
- `/tmp/qxwap-local-web.pid`

## Current Read

First healthy cycle on 2026-05-28:

- local frontend shell: pass
- local API smoke: pass
- local full journey smoke: pass
- typecheck/test/build: pass
- remaining blocker: PR `#221` still draft + Netlify site `effulgent-dragon-68def1`
