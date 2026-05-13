# QXwap Production Monorepo Patch Bundle

This branch was created by Codex as the production-deploy handoff branch.

The local source-of-truth monorepo has already been prepared and validated in the Codex workspace, but this machine cannot push Git objects to GitHub over HTTPS because no GitHub credential is configured for `git push`.

## Local commit prepared

```text
branch: codex/production-deploy-readiness
local temp checkout: /tmp/qxwap-github-push
commit: 1fc84f7072829c9492316899ae162f8ffca7f395
message: chore: prepare production monorepo deployment
```

## What the local commit contains

- Replaces the older QXwap repo structure with the local source-of-truth monorepo.
- Adds `apps/api` Express API with DB/session/upload/runtime preflight support.
- Adds `apps/web` React/Vite mobile-first QXwap frontend.
- Adds Render blueprint in `render.yaml`.
- Adds GitHub Pages workflow in `.github/workflows/pages.yml`.
- Adds production scripts:
  - `pnpm preflight:frontend`
  - `pnpm preflight:backend`
  - `pnpm smoke:api`
  - `pnpm inject:web-api-base`
  - `pnpm check:web-dist`
  - `pnpm gate:production`
- Adds `docs/production-action-board.md` for Render + Supabase + GitHub Pages launch.

## Validation already run

From `/tmp/qxwap-github-push`:

```bash
pnpm install --frozen-lockfile
pnpm gate:production
```

Result: passed locally.

## How Claude Code / Atlas should finish

On a machine with GitHub push credentials:

```bash
cd /tmp/qxwap-github-push
git status -sb
git log --oneline -1
git push -u origin codex/production-deploy-readiness
```

Then open a PR from `codex/production-deploy-readiness` to `main`.

If `/tmp/qxwap-github-push` is not available, use the Codex workspace at:

```text
/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
```

and copy/sync it into a fresh checkout of `aswer18400/QXwap`, excluding:

```text
node_modules
.data
apps/*/node_modules
apps/*/.data
apps/*/dist
apps/*/uploads
uploads
```

Then run:

```bash
pnpm install --frozen-lockfile
pnpm gate:production
git push -u origin codex/production-deploy-readiness
```

## Important

Do not commit real secrets. Configure these only in Render/Supabase/GitHub dashboards:

```text
DATABASE_URL
SESSION_SECRET
FRONTEND_ORIGIN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STORAGE_BUCKET
API_BASE_URL
```
