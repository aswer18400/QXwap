# QXwap AI Start Here

## Current Canonical State (2026-05-18)

- GitHub `main` is the only source of truth.
- The old GitHub history was intentionally replaced from the canonical local snapshot.
- Current `main` root commit:
  - `a0f7c8e59ab692f72fc775878ea5cef1e5b0121f`
  - `Initialize QXwap from canonical local snapshot`
- Remote branches were deleted. Only `origin/main` should remain.
- Open PRs were closed. Do not reopen PR #140 / #141 or old Dependabot/Cursor/Claude branches.
- `QXwap-full-orchestrated/**` was removed and must not be restored.

## Rules For The Next AI

1. Start with a fresh clone or latest `origin/main`.
2. Do not use older local folders as source of truth.
3. Do not compare against old GitHub branches unless the user explicitly asks for archaeology.
4. Create one new branch per sprint.
5. Open Draft PRs only unless the user explicitly says to merge.
6. Do not merge without user approval.
7. Do not recreate deleted branches, `gh-pages`, or old prototype branches.
8. Keep code in the current monorepo structure:
   - `apps/web`
   - `apps/api`
   - `docs`
   - `scripts`
   - `supabase`
9. Update this file after each meaningful project state change.

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

## Required Checks Before Sending Work Back

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
- Frontend: GitHub Pages, but the old `gh-pages` branch was deleted during cleanup. Recreate deployment only from current `main`.

## Next Recommended Work

Phase 1 should continue from current `main` only:

1. Auth hardening and mobile QA.
2. Database schema verification against Supabase.
3. API layer smoke tests against Render/Supabase.
4. Feed/Product/Offer mobile flow fixes.
5. Production deployment wiring from clean `main`.

Do not bring back old mock/prototype files unless the user explicitly asks.
