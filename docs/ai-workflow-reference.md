# QXwap AI Workflow Reference

This file is intentionally separate from `AI_START_HERE.md` so agents can start fast and open this only when they need full commands or deployment context.

## Canonical State

- GitHub `main` is the only source of truth.
- The old GitHub history was intentionally replaced from the canonical local snapshot.
- Root reset commit:
  - `a0f7c8e59ab692f72fc775878ea5cef1e5b0121f`
  - `Initialize QXwap from canonical local snapshot`
- Current canonical state: latest `origin/main`. Do not rely on pinned historical commits for active work.
- Remote branches were deleted. Only `origin/main` should remain.
- Open PRs were closed. Do not reopen PR #140 / #141 or old Dependabot/Cursor/Claude branches.

## Repo Setup

```bash
git clone https://github.com/aswer18400/QXwap.git
cd QXwap
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install --frozen-lockfile
```

## Local Dev

API:

```bash
PGLITE_DATA_DIR=.data/qxwap-pglite-parity pnpm --filter @workspace/api-server dev
```

Web:

```bash
PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0
```

URLs:

- Web: `http://localhost:5173`
- API health: `http://localhost:8787/api/health`

## Required Checks Before Handoff

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
git diff --check
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
```

## Deployment Target

- Backend: Render
- Database + Storage: Supabase
- Frontend: GitHub Pages
- The old `gh-pages` branch was deleted during cleanup. Recreate frontend deployment only from current `main`.

## Recommended Next Work

Phase 1 should continue from current `main` only:

1. Auth hardening and mobile QA.
2. Database schema verification against Supabase.
3. API layer smoke tests against Render/Supabase.
4. Feed/Product/Offer mobile flow fixes.
5. Production deployment wiring from clean `main`.

## Handoff Format

Every AI handoff should include:

- branch name
- Draft PR link, if created
- files changed
- tests/checks run
- known failures or skipped checks
- next step
