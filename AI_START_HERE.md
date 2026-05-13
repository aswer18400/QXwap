# QXwap AI Start Here

Use this file as the low-token entrypoint for any AI/dev continuing QXwap.

## Immediate Production Handoff

For the current production-deploy continuation, read this file first, then read:

```text
docs/ai-handoff-2026-05-13.md
```

That handoff is the current source for what was completed on 2026-05-13 and what remains in Render/Supabase/GitHub Pages. Do not spend time trying undocumented Render APIs; continue through dashboard steps unless the user provides clean official credentials.

## Rule

Read this file first. Do not read the whole repo or all docs.

For production deploy work, read `docs/ai-handoff-2026-05-13.md` before any other deploy document. For non-deploy work, pick one task card from `docs/ai-context/`, then read only the files listed in that card.

After every meaningful code, QA, deploy, or handoff change, update this `AI_START_HERE.md` file before finishing the turn.

## Source Of Truth

Local monorepo:

```text
/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
```

GitHub repository:

```text
https://github.com/aswer18400/QXwap
```

As of 2026-05-13, PR #113 has merged the production monorepo into `main`. Do not move the app back to the old structure.

## Current Status

Last verified: 2026-05-13.

Production handoff status: PR #113 is merged into `main` at merge commit `4d3e655791df682846309b220c3e4612d64a554c`; CI and GitHub Pages workflow passed on that commit. Remaining manual work is Render dashboard build/start/env configuration, Supabase Postgres/Storage setup, and final smoke/browser QA. See `docs/ai-handoff-2026-05-13.md`.

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
- GitHub branch `codex/production-deploy-readiness` was merged through PR #113 into `main`; the deployable monorepo is now on GitHub `main`.
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
| Deploy/staging | `docs/ai-handoff-2026-05-13.md` | then `docs/production-action-board.md`, `render.yaml`, `.github/workflows/pages.yml` |
| Hand off to another AI | `docs/ai-handoff-2026-05-13.md` | then `docs/ai-context/PROMPTS.md` only if a reusable prompt is needed |

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

1. Complete Render dashboard setup for service `srv-d7mfphu7r5hc73868seg`: Build command, Start command, production env vars, then Manual Deploy from `main`.
2. Complete Supabase setup: Postgres `DATABASE_URL`, project `SUPABASE_URL`, backend-only `SUPABASE_SERVICE_ROLE_KEY`, public Storage bucket `qxwap` for image MIME types.
3. Set GitHub Actions repository variable `API_BASE_URL=https://<render-service>.onrender.com/api` and rerun the GitHub Pages workflow on `main`.
4. Smoke test production with `preflight:frontend`, `smoke:api`, `/api/health`, `/api/version`, and `check:web-dist` as documented in `docs/ai-handoff-2026-05-13.md`.
5. Run final browser QA on `https://aswer18400.github.io/QXwap/` and confirm cookies/CORS with real HTTPS frontend/backend origins.

Render backend blueprint exists at `render.yaml`, but dashboard env values still require real Supabase/Postgres/storage/frontend values before production is complete.

Detailed staging checklist exists at `docs/staging-setup-guide.md`.
Staging env checklist template exists at `.env.staging.example`.
Short production action board exists at `docs/production-action-board.md`.

Step-by-step browser QA before deploy: `docs/ui-qa-checklist.md` (owner gating + search/filter + profile photo).
Real Android Chrome QA before public launch: `docs/android-chrome-qa.md`.

Linear deploy-day runbook (top-to-bottom): `docs/deploy-day-runbook.md`.

## Hard Constraints

- Do not deploy unless the user explicitly asks.
- Do not guess real secrets.
- Do not rewrite the monorepo structure.
- Do not touch backend/database for design-only work.
- Do not read `docs/qxwap-*.html` unless working on Figma/prototype.
- Use `rg` before opening large files.
- Update `docs/manual-qa.md` when you verify a user flow.
- Update this `AI_START_HERE.md` whenever status, commands, risks, or next steps change.
