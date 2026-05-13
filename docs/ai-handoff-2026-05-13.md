# QXwap AI Handoff — 2026-05-13

Author: **Manus AI**

This is the compact handoff for the next AI, Claude Code session, or human operator continuing QXwap production deployment. Start here instead of reading the whole repository. The monorepo has already been merged into `main`; the remaining production work is dashboard configuration for Render and Supabase, followed by smoke testing and final browser QA.

> **Current handoff rule:** Do not spend more time trying to mutate Render through undocumented APIs. A prior attempt found browser cookies with garbage bytes/prefix problems and unreliable cookie decryption. Because no clean Render API credential is available, finish the deployment through the Render dashboard and keep this document as the source of truth for the next operator.

## 1. Executive Status

| Area | Status | Evidence / Link |
|---|---:|---|
| GitHub repository | Ready on `main` | [`aswer18400/QXwap`](https://github.com/aswer18400/QXwap) |
| Production monorepo PR | **Merged** | PR [`#113`](https://github.com/aswer18400/QXwap/pull/113) merged into `main` |
| Merge commit | **`4d3e655791df682846309b220c3e4612d64a554c`** | Confirmed with GitHub CLI on 2026-05-13 |
| CI on merge commit | **Passed** | CI run [`25810190394`](https://github.com/aswer18400/QXwap/actions/runs/25810190394) |
| GitHub Pages workflow | **Passed** | Pages run [`25810190473`](https://github.com/aswer18400/QXwap/actions/runs/25810190473) |
| GitHub Pages frontend | Live | `https://aswer18400.github.io/QXwap/` |
| Backend production deploy | **Not complete** | Render dashboard still needs correct build/start settings and env vars |
| Supabase production storage/database | **Not complete** | Supabase project/bucket/env values must be created or copied manually |

The important completed milestone is that the old repository shape has been replaced by the production monorepo on `main`. The remaining blocker is **not code**; it is dashboard-only infrastructure setup for Render and Supabase.

## 2. What Was Completed Today

| Completed item | Result |
|---|---|
| Monorepo push and merge | PR `#113` from `codex/production-deploy-readiness` to `main` was merged. |
| CI | The current `main` commit passed the repository CI workflow. |
| GitHub Pages | The web deployment workflow completed successfully and the static frontend is published. |
| Frontend CI health-check bug | The frontend preflight no longer pings a real external URL in CI when it should not. |
| Production scripts | `pnpm gate:production`, API build/test, frontend build, backend/frontend preflights, API-base injection, and web-dist checks are present. |
| Deployment configuration | `render.yaml` and `.github/workflows/pages.yml` exist on `main`. |
| Handoff structure | This document is the current production handoff. `AI_START_HERE.md` should point future AIs here. |

The original production monorepo patch was prepared as commit `1fc84f7072829c9492316899ae162f8ffca7f395` with message `chore: prepare production monorepo deployment`, then later merged into `main` through PR `#113`. The post-merge `main` commit to treat as current is `4d3e655791df682846309b220c3e4612d64a554c`.

## 3. Repository and File Map

| Purpose | Path / URL |
|---|---|
| GitHub repository | `https://github.com/aswer18400/QXwap` |
| Main local source of truth on the user's Mac | `/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to` |
| Frontend app | `apps/web` |
| Backend/API app | `apps/api` |
| Render blueprint | `render.yaml` |
| GitHub Pages workflow | `.github/workflows/pages.yml` |
| Short production board | `docs/production-action-board.md` |
| Full deploy-day runbook | `docs/deploy-day-runbook.md` |
| Original monorepo patch notes | `docs/production-monorepo-patch/README.md` |
| This handoff | `docs/ai-handoff-2026-05-13.md` |

A future AI should usually read only `AI_START_HERE.md`, this handoff, `docs/production-action-board.md`, `render.yaml`, and `.github/workflows/pages.yml`. Open the longer deploy-day runbook only when executing or troubleshooting the dashboard steps.

## 4. Do Not Commit Secrets

All real production values must stay in dashboards or a password manager only. Do **not** commit real secrets into Git, comments, screenshots, issue text, docs, or frontend variables.

| Secret / value | Where it belongs | Notes |
|---|---|---|
| `DATABASE_URL` | Render env var | Supabase Postgres URI; include `sslmode=require` if needed. |
| `SESSION_SECRET` | Render env var | Generate a strong random value. Do not use placeholders. |
| `FRONTEND_ORIGIN` | Render env var | For GitHub Pages, use `https://aswer18400.github.io` with no path and no trailing slash. |
| `SUPABASE_URL` | Render env var | Supabase project URL, e.g. `https://<ref>.supabase.co`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Render env var only | Backend-only secret. Never expose it to GitHub Pages or frontend code. |
| `STORAGE_BUCKET` | Render env var | Use `qxwap`. |
| `API_BASE_URL` | GitHub Actions repository variable | Use `https://<render-service>.onrender.com/api`. |

## 5. Remaining Manual Step 1 — Supabase

Create or open the production/staging Supabase project, then configure Postgres and Storage. The bucket must be public because the current app expects public image URLs after upload.

| Supabase item | Required setting |
|---|---|
| Project | Create/open a QXwap project, preferably in a region close to users. |
| `DATABASE_URL` | Copy the Postgres connection string URI and include the database password. Add `sslmode=require` if it is not already present. |
| `SUPABASE_URL` | Copy the project URL from Project Settings → API. |
| `SUPABASE_SERVICE_ROLE_KEY` | Copy the service role key from Project Settings → API. Store it backend-only. |
| Storage bucket | Create bucket named `qxwap`. |
| Bucket visibility | Public enabled. |
| Allowed MIME types | `image/png`, `image/jpeg`, `image/webp`, `image/gif`. |
| Max file size | 6 MB. |

The API smoke test uploads a tiny PNG, so the bucket can remain image-only. Do not add `text/plain` just to satisfy smoke tests.

## 6. Remaining Manual Step 2 — Render

Use the existing Render service if it already exists, or create/update it from `render.yaml`. The user identified the Render service URL as:

```text
https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg
```

Go to Render Dashboard → service `srv-d7mfphu7r5hc73868seg` → Settings → Build & Deploy, and ensure these commands are set exactly:

```bash
corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build
```

```bash
pnpm --filter @workspace/api-server start
```

Then configure the environment variables below in Render. Use dashboard values only; do not paste them into the repository.

| Render env var | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase Postgres URI from Supabase settings |
| `SESSION_SECRET` | Strong generated secret |
| `FRONTEND_ORIGIN` | `https://aswer18400.github.io` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STORAGE_BUCKET` | `qxwap` |

After saving settings, run **Manual Deploy → main**. Wait until Render reports the deployment as live/healthy.

## 7. Backend Verification After Render Deploy

Once Render is live, set these temporary shell variables on the operator's machine. Do not commit them.

```bash
export RENDER_BACKEND_URL="https://<render-service>.onrender.com"
export API_BASE_URL="$RENDER_BACKEND_URL/api"
```

Run the health checks and smoke test from the monorepo:

```bash
cd /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
curl --fail "$RENDER_BACKEND_URL/api/health"
curl -s "$RENDER_BACKEND_URL/api/version" | python3 -m json.tool
API_BASE_URL="$RENDER_BACKEND_URL/api" pnpm smoke:api
```

Expected `/api/health` should show `ok: true`, database connected, and all required tables present. Expected `/api/version` should identify the deployed Git commit. Expected `pnpm smoke:api` should end with an `ok: true` JSON containing an `item_id`, `offer_id`, and `upload_url`.

| Smoke-test observation | Meaning | Action |
|---|---|---|
| `upload_url` starts with `https://<ref>.supabase.co/storage/v1/object/public/qxwap/` | Supabase Storage is correctly wired. | Continue. |
| `upload_url` starts with `/uploads/` | Render did not receive Supabase storage env vars. | Re-check `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, then redeploy. |
| `/api/health` returns 502/504 | Render cold start or failed boot. | Wait 60 seconds, retry, then check Render logs. |
| `required_tables` is lower than expected | Migration/database init did not complete. | Check Render logs and `DATABASE_URL`. |
| Sign-in returns 401 or cookies fail | Cookie/CORS origin issue. | Confirm HTTPS and exact `FRONTEND_ORIGIN=https://aswer18400.github.io`. |

## 8. GitHub Pages Finalization

The GitHub Pages workflow is already present and has passed once on `main`, but it must be rerun with the final production Render API URL. In GitHub repository settings, configure the repository variable below.

| GitHub setting | Required value |
|---|---|
| Pages source | GitHub Actions |
| Actions variable `API_BASE_URL` | `https://<render-service>.onrender.com/api` |

Then go to Actions → **Deploy QXwap Web** → Run workflow on `main`, or push a small docs/status commit after the variable is set. The workflow normalizes the API URL to a single `/api`, builds `apps/web`, injects the API base into the static dist, and verifies the built output.

Expected workflow markers:

```text
[QXwap preflight] passed
[QXwap inject API base] passed
[QXwap web dist check] passed
```

If a network request contains `/api/api`, the variable was set with duplicate path handling somewhere. Reset `API_BASE_URL` to exactly `https://<render-service>.onrender.com/api` and rerun the workflow.

## 9. Final Browser QA

Open the live frontend in a fresh browser profile or incognito session:

```text
https://aswer18400.github.io/QXwap/
```

Perform the QA below at a 390px mobile viewport and also check a normal desktop width. The goal is to confirm that the static frontend talks to the Render API and that persistent data/images go through Supabase.

| QA check | Expected result |
|---|---|
| Feed load | Feed loads real API data and no blank page appears. |
| Network tab | API requests go to the Render backend, not `localhost`. |
| Console | No CORS errors and no mixed-content warnings. |
| Signup/signin | A throwaway account can register and sign in. |
| Add product | Product can be created with an image. |
| Image persistence | Product image remains after refresh and uses Supabase public URL. |
| Profile photo | Avatar persists after refresh/re-login. |
| Ownership gating | A second account cannot see Edit/Delete on another user's product. |
| Xwap offer | A user with no products can send an offer with message, cash, and credit. |
| Inbox | The receiving account sees the offer and can exercise offer actions. |
| Mobile layout | 390px viewport has no horizontal scroll. |

If any browser QA step fails, capture a screenshot, the Network request/response including `x-request-id`, and the matching Render log line. The API attaches `x-request-id` to responses and production logs include the same request ID for correlation.

## 10. Commands for a Future Claude Code Session

If the next AI is operating on the user's Mac, start with the source-of-truth monorepo:

```bash
cd /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
git status -sb
git log --oneline -5
pnpm install --frozen-lockfile
pnpm gate:production
```

If GitHub authentication is needed on macOS, use the browser/keychain flow rather than embedding tokens in commands. A safe sequence is:

```bash
gh auth status || gh auth login --web --git-protocol https
gh auth setup-git
git remote -v
git push
```

Do not create another monorepo replacement PR unless the current `main` is missing the merged monorepo. As of this handoff, `main` already contains the production monorepo.

## 11. Recommended Read Order for the Next AI

| Situation | Read |
|---|---|
| Need immediate current state | `AI_START_HERE.md`, then this file |
| Need dashboard deploy steps | `docs/production-action-board.md`, then `docs/deploy-day-runbook.md` |
| Need Render exact config | `render.yaml` |
| Need Pages exact config | `.github/workflows/pages.yml` |
| Need original branch/commit provenance | `docs/production-monorepo-patch/README.md` |
| Need frontend/backend internals | Use the AI context cards under `docs/ai-context/` and inspect only the target files |

## 12. References

[1]: https://github.com/aswer18400/QXwap "QXwap GitHub Repository"
[2]: https://github.com/aswer18400/QXwap/pull/113 "QXwap PR #113"
[3]: https://github.com/aswer18400/QXwap/actions/runs/25810190394 "QXwap CI run on merge commit"
[4]: https://github.com/aswer18400/QXwap/actions/runs/25810190473 "QXwap GitHub Pages workflow run on merge commit"
