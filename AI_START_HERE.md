# QXwap AI Start Here

## Latest Status (2026-05-17 15:02 +07)

- Render API is live on the monorepo backend and now runs commit `0c14e8f8836ced3cb39606c1bcbe127ada97c2a9`.
- PR #131 fixed production session cookies behind Render:
  - `POST https://qxwap-api.onrender.com/api/auth/signup` now returns `Set-Cookie: qxwap.sid=...; HttpOnly; Secure; SameSite=None`.
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api` passed.
- PR #132 fixed `/api/notifications/read` on Supabase by removing the `$2::uuid` query pattern.
- Production smoke passed:
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api` -> passed.
  - Smoke created an item, uploaded an image to Supabase Storage, created an offer, and confirmed `required_tables: 18`.
- Full production smoke passed:
  - `API_BASE_URL=https://qxwap-api.onrender.com/api node scripts/qxwap-full-smoke.mjs` -> 38 assertions, failed 0.
  - Covered health/version, signup sessions, owner/non-owner permissions, search/filter, Supabase image upload, profile photo persistence, no-item offer flow, shipment start, notifications mark-read, and owner delete cleanup.
- Frontend production API base verified:
  - `https://aswer18400.github.io/QXwap/` serves `window.API_BASE = "https://qxwap-api.onrender.com/api"`.
  - `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm preflight:frontend --health` -> passed.
- Frontend UI patch in progress:
  - Guest `AuthNudge` bottom layer was reduced and blur removed so it no longer visually washes out the lower Feed.
  - Local verification after this patch: `pnpm run typecheck` passed and `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build` passed.
- Frontend production gap:
  - `https://aswer18400.github.io/QXwap/status.html` currently returns GitHub Pages 404. Main app URL works, but status page is missing from deployed Pages output.
- Next priority:
  - Continue mobile Feed UI/product-card fixes against the now-working production backend.
  - Restore/deploy `status.html` if this page is still required for launch monitoring.

Use this file as the low-token entrypoint for any AI/dev continuing QXwap.

## Rule

Read this file first. Do not read the whole repo or all docs.

> **Continuing from last session?** → Read `docs/ai-handoff-2026-05-13.md` first — contains full plan, what's done, and exact steps to fix Render + Supabase.

Pick one task card from `docs/ai-context/`, then read only the files listed in that card.

After every meaningful code, QA, deploy, or handoff change, update this `AI_START_HERE.md` file before finishing the turn.

## Source Of Truth

Local monorepo:

```text
/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
```

GitHub reference only:

```text
https://github.com/aswer18400/QXwap
```

Do not treat GitHub as source of truth. Do not move the app back to the old structure.

## Current Status

Last verified: 2026-05-14 10:28 +07.

### ✅ Production Deploy Complete (2026-05-13)

PR #113 `codex/production-deploy-readiness` was merged to `main`.

**GitHub:**
- Branch pushed via Python/Security.framework (macOS Keychain OAuth token)
- PR #113 merged: commit `4d3e655` on main
- CI (Typecheck / Test / Build): ✅ passed
- GitHub Pages deploy (`Deploy QXwap Web`): ✅ passed — frontend live at `https://aswer18400.github.io/QXwap/`
- CI fix applied: frontend preflight in `.github/workflows/ci.yml` now skips health ping (uses `node scripts/qxwap-preflight.mjs --target=frontend --production`, not `pnpm preflight:frontend` which tries to fetch)

**Render backend:**
- Service: `qxwap-api` (`srv-d7mfphu7r5hc73868seg`) at `https://qxwap-api.onrender.com`
- 2026-05-14 01:13 +07: Render dashboard Build Command was temporarily updated to `corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build`.
- That deploy (`dep-d82btc57vvec73b56sp0`) failed because `corepack enable` attempted to unlink `/usr/bin/pnpm` on Render's read-only filesystem (`EROFS: read-only file system, unlink '/usr/bin/pnpm'`).
- 2026-05-14 01:16 +07: Build Command was changed to the Render-compatible command `corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build`; Start Command already matches `pnpm --filter @workspace/api-server start`.
- Saving that command opened deploy `dep-d82bvs3bc2fs73c8q5fg`, but the Render dashboard page became blank/stale in Chrome and could not confirm final status.
- Render logs later confirmed `dep-d82bvs3bc2fs73c8q5fg` failed after `pnpm install` skipped dev dependencies because `NODE_ENV=production`; TypeScript then failed with `TS2688: Cannot find type definition file for 'node'` and `TS2688: Cannot find type definition file for 'vitest'`.
- 2026-05-14 10:03 +07 smoke check still returns the OLD runtime: `GET https://qxwap-api.onrender.com/api/health` → `200 {"ok":true}`, `GET /` serves the web app HTML, and `GET /api/version` → `404 {"error":"Not Found"}`.
- Expected new API health is `{"ok":true,"name":"QXwap API","database":"connected",...}`. Until this appears, Render is not fully on the new monorepo API runtime.
- Root dir should be monorepo root (blank or `.`), not `api/`. Current dashboard showed Root Directory value `.` before the save.
- Local `render.yaml` has been patched to remove `corepack enable` and install dev dependencies during build with `--prod=false`; local verification passed: `corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/api-server build`.
- GitHub PR #127 `fix: make Render API deploy command compatible` was merged to `main` with squash commit `6e87f6337d9473e24677a26eab3988e36ee2c13c`. It updates `render.yaml`, `AI_START_HERE.md`, and `docs/ai-context/05-deploy-next.md`.
- GitHub PR #128 `fix: install dev dependencies during Render API build` was merged to `main` with squash commit `7db9375392200d478514ae40af1b1cecc5455c19`; it changes Render install to `pnpm install --frozen-lockfile --prod=false`.
- Render deploy `dep-d82jsivaqgkc73ek8b20` from commit `7db9375` still failed with build exit status 2. Render dashboard logs were not readable because Chrome showed a blank/stale Render page.
- Local reproduction with `NODE_ENV=production` and `pnpm install --frozen-lockfile --prod=false` passes, so the next patch hardens API production build even if Render/dashboard still installs production dependencies only:
  - `apps/api/tsconfig.json` should compile `src` only and load only `node` types.
  - API build-time packages required by `tsc` should be in `apps/api/package.json` dependencies, not devDependencies.

**Supabase:**
- Not yet configured — needs new project or confirm existing project credentials
- Required env vars for Render: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET=qxwap`

**API_BASE_URL secret:** already set in GitHub Actions (`https://qxwap-api.onrender.com/api`) — do not change until Render is updated and healthy

Local QA and build gates passed after the latest Feed/AuthNudge/Inbox fixes:

- Feed loads API data.
- Mobile 390px has no horizontal scroll.
- Product card opens detail.
- Wanted tag moves to Shop and applies filter.
- Login loads products without browser refresh.
- Add product refreshes Feed/Shop.
- User with no products can send Xwap with message, cash, and credit.
- Inbox shows sent/received offers and offer actions.
- Accepted offer can start Instant Swap shipment.
- API health reports required tables.
- Uploads use local disk in dev and Supabase Storage in production when storage env vars are set.
- API tests cover profile avatar persistence, owner-only edit/delete, and combined search/filter behavior.
- Production runtime config fails fast if required env/secrets are unsafe or incomplete.
- API deploy smoke script uploads a tiny PNG image, gives clear non-JSON/API-base errors, and passes locally.
- Deploy-day runbook now keeps Supabase Storage image-only; no `text/plain` bucket exception is needed.
- Render backend blueprint exists at `render.yaml`.
- GitHub Pages workflow checks API preflight and built web dist paths/API injection.
- Web API-base injection is now a shared script: `pnpm inject:web-api-base`; GitHub Pages uses the same script.
- One-command local production gate exists: `pnpm gate:production`.
- Short production action board exists at `docs/production-action-board.md`.
- Android Chrome real-device QA checklist exists at `docs/android-chrome-qa.md`.
- LAN helper `pnpm qa:lan` runs and prints phone URLs for Android Chrome QA.
- Staging env template exists at `.env.staging.example`.
- Session secret helper exists: `pnpm -s secret:session` (quiet output, 64-character default).

Evidence:

```text
docs/manual-qa.md
docs/qa-final-feed-mobile-390.png
docs/qa-inbox-offer-mobile-390.png
docs/qa-shipment-flow-mobile-390.png
docs/qa-profile-photo-ui-390.png
```

## Pick The Smallest Context

| User asks for | Read next | Then inspect |
|---|---|---|
| Current project status | `docs/ai-context/00-current-state.md` | no extra files unless needed |
| Run/test locally | `docs/ai-context/01-runbook.md` | package scripts only if command fails |
| Frontend UI/bug | `docs/ai-context/02-frontend-next.md` | target screen/component/CSS only |
| Backend/API/DB | `docs/ai-context/03-backend-next.md` | target route/schema/test only |
| Figma/design system | `docs/ai-context/04-figma-design-system.md` | Figma kit/scripts only |
| Deploy/staging | `docs/ai-context/05-deploy-next.md` | deployment plan/env examples |
| Hand off to another AI | `docs/ai-context/PROMPTS.md` | copy one prompt |

## Dev URLs

API:

```text
http://localhost:8787/api/health
```

If `pnpm smoke:api` fails with an HTML 404 for `/api/version`, the process on `8787` is likely an older API instance. Start the current API on a spare port, for example `PORT=8791 PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev`, then run `pnpm smoke:api:qa`.

Web:

```text
http://localhost:5173
```

Docs:

```text
http://localhost:8099/qxwap-figma-final-package.html
```

## Minimal Commands

Start API:

```bash
PGLITE_DATA_DIR=.data/qxwap-pglite-parity pnpm --filter @workspace/api-server dev
```

If that local PGlite directory aborts, do not delete it. Use a fresh QA dir:

```bash
PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev
```

Start Web:

```bash
PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0
```

Android LAN helper:

```bash
pnpm qa:lan
```

Frontend-only check:

```bash
pnpm run typecheck
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
```

Backend-only check:

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
pnpm smoke:api:qa
```

Deploy preflight:

```bash
pnpm gate:production
API_BASE_URL=https://<backend-domain>/api pnpm preflight:frontend
DATABASE_URL=postgresql://... SESSION_SECRET=<secret> FRONTEND_ORIGIN=https://<frontend-domain> NODE_ENV=production pnpm preflight:backend
API_BASE_URL=https://<backend-domain>/api pnpm smoke:api
API_BASE=https://<backend-domain>/api pnpm inject:web-api-base
BASE_PATH=/QXwap/ API_BASE=https://<backend-domain>/api pnpm check:web-dist
```

Generate a production/staging session secret:

```bash
pnpm -s secret:session
```

CI runs typecheck + tests + builds + preflight on every PR and main push via `.github/workflows/ci.yml`. Pages deploy is `.github/workflows/pages.yml` (requires `API_BASE_URL` repo variable).

Every API response carries an `x-request-id` header. The server also accepts and forwards a valid client-supplied id (alnum + `._-`, max 128 chars). All API logs are single-line JSON in production with the same `requestId`, so to debug a prod issue, grab the id from the client request/response headers and grep Render logs for that id.

Conflict/whitespace check:

```bash
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

## Current Known Next Work

### 🔴 Blocking: Render deploy/status still needs confirmation

Render Build Command was updated in the dashboard, but the public API still looks like the old runtime. The repo's local `render.yaml` has also been patched to remove `corepack enable`.

**Current evidence:**
1. `corepack enable ...` deploy `dep-d82btc57vvec73b56sp0` failed on Render with `EROFS: read-only file system, unlink '/usr/bin/pnpm'`.
2. Deploy `dep-d82bvs3bc2fs73c8q5fg` got past corepack but failed because `pnpm install` skipped dev dependencies under `NODE_ENV=production`; fix is `pnpm install --frozen-lockfile --prod=false`.
3. Required Build Command: `corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/api-server build`
4. Start Command already correct: `pnpm --filter @workspace/api-server start`
5. `curl https://qxwap-api.onrender.com/api/health` still returns only `{"ok":true}`.
6. `curl https://qxwap-api.onrender.com/` still serves the web app HTML, which means Render is still running the old/frontend runtime.
7. `curl https://qxwap-api.onrender.com/api/version` returns `404`, so the new API build is not verified live yet.
8. Local Render-compatible build command with `--prod=false` passed on 2026-05-14 10:14 +07.
9. GitHub PR #127 merged to `main`: `6e87f6337d9473e24677a26eab3988e36ee2c13c`.
10. GitHub PR #128 merged to `main`: `7db9375392200d478514ae40af1b1cecc5455c19`.
11. Render auto-deploy `dep-d82jsivaqgkc73ek8b20` for PR #128 / commit `7db9375` failed with build exit status 2; latest detailed logs could not be read from Render UI because the page rendered blank in Chrome.
12. Local hardening patch prepared: API `tsconfig` compiles `src` only, removes `vitest` from production build types, and keeps `typescript` plus required `@types/*` in API dependencies so production-only installs can still build.
13. Verification passed locally after hardening: `pnpm run typecheck`, `pnpm --filter @workspace/api-server test`, `pnpm --filter @workspace/api-server build`, and `NODE_ENV=production pnpm --filter @workspace/api-server build`.

**Next steps:**
1. Open PR for the API production-build hardening patch and merge to `main`.
2. Let Render auto-deploy the new commit or trigger Manual Deploy from latest `main`.
3. In Render, open `qxwap-api` → Events/Logs and confirm latest deploy status.
4. If build fails, inspect whether Render is honoring Dashboard settings or `render.yaml`; root directory must be monorepo root (`.`/blank), Build Command should be `corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile --prod=false && pnpm --filter @workspace/api-server build`, and Start Command must be `pnpm --filter @workspace/api-server start`.
5. If Render is still serving web HTML at `/`, force settings to Backend-only with the Build/Start commands above.
6. After deploy: verify `https://qxwap-api.onrender.com/api/health` returns `{"ok":true,"name":"QXwap API","database":"connected",...}`.

### 🔴 Blocking: Supabase needs setup or confirmation

Required for uploads and full database:
1. Create/confirm Supabase project
2. Create Storage bucket named `qxwap` (public read, image-only)
3. Get `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
4. Add to Render service env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (Supabase Postgres connection string), `FRONTEND_ORIGIN=https://aswer18400.github.io`

### After Render + Supabase fixed

5. Run `API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api` to verify full stack
6. Run Android Chrome device QA (`docs/android-chrome-qa.md`)
7. GitHub Pages will auto-redeploy on next main push (or trigger manually)

### Lower priority

- Confirm production cookies/CORS with real HTTPS origins
- `docs/staging-setup-guide.md` for staging checklist
- `docs/ui-qa-checklist.md` for pre-launch browser QA
- `docs/android-chrome-qa.md` for mobile QA
- `docs/deploy-day-runbook.md` for full runbook

## Hard Constraints

- Do not deploy unless the user explicitly asks.
- Do not guess real secrets.
- Do not rewrite the monorepo structure.
- Do not touch backend/database for design-only work.
- Do not read `docs/qxwap-*.html` unless working on Figma/prototype.
- Use `rg` before opening large files.
- Update `docs/manual-qa.md` when you verify a user flow.
- Update this `AI_START_HERE.md` whenever status, commands, risks, or next steps change.
