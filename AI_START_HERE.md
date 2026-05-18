# QXwap AI Start Here

## Latest Status (2026-05-18 10:05 +07)

This file is the low-token handoff entrypoint. Read this first, then read only the task-specific files listed below.

### Current source-of-truth state

- GitHub `main` is the current production reference and is now at commit `d74c64d06af7c2edf6641885d9131a20444d0ea6`.
- Local path may still contain local-only work: `/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to`.
- Do not overwrite either side wholesale. Always diff local vs GitHub before copying work.
- The latest merged GitHub work is intentionally scoped to frontend/status/ops utilities, not a full local import.

### Active Sprint: AI-safe repository cleanup

- Branch: `sprint/ai-safe-repo-cleanup`.
- Worktree: `/Users/raynee/.openclaw/qxwap-ai-cleanup-sprint`.
- Goal: remove stale unused runtime files and obsolete handoff docs, then add clear AI working rules so the next AI can continue without reading the whole repo.
- Do not touch PR #140 or PR #141.
- Do not modify `QXwap-full-orchestrated/**`.
- Keep the app source of truth in `apps/web` and `apps/api`.
- Use `AGENTS.md` and `docs/ai-context/README.md` for AI working rules.

### Completed in this handoff session

- PR #136 merged: `Update QXwap status and auth utilities`.
  - Added `apps/web/public/status.html`.
  - Added `ApiError` and `RateLimitError` in `apps/web/src/lib/api.ts`.
  - Added AuthModal modes: `signin`, `signup`, `forgot`.
  - Added scripts:
    - `scripts/qxwap-status-check.mjs`
    - `scripts/qxwap-render-env-check.mjs`
    - `scripts/qxwap-deploy-now.mjs`
  - Wired root scripts:
    - `pnpm smoke:full`
    - `pnpm env:render`
    - `pnpm deploy:now`
- PR #137 merged: `fix: avoid missing forgot password endpoint`.
  - Forgot-password UI no longer calls missing `/api/auth/forgot`.
  - It displays a local notice until the backend reset flow exists.
- Issue #138 opened: `Implement backend forgot-password endpoint and rate limiting`.
  - This is the canonical follow-up for backend `/api/auth/forgot` and scoped rate limiting.

### Important caveat

The first version of AuthModal tried to call `/auth/forgot`, but the backend route does not exist yet. PR #137 fixed this by avoiding the call. Do not re-enable the API call until Issue #138 is implemented.

### Current deploy/verification status

- GitHub connector returned no CI status and no workflow runs for merge commit `e20366e72b6140640bbd3430d2b654bdd2feba40`.
- GitHub Pages and Render production need live verification after the latest `main` deploy.
- Check these URLs after deployment finishes:

```text
https://aswer18400.github.io/QXwap/status.html
https://aswer18400.github.io/QXwap/
https://qxwap-api.onrender.com/api/health
https://qxwap-api.onrender.com/api/version
```

### Next priority for another AI/dev

1. Verify GitHub Pages deployed the new `status.html`.
2. Verify the main app still loads and API base is correct.
3. Verify Render API is still healthy.
4. Implement Issue #138 as a small backend patch only:
   - Add `/api/auth/forgot` or the chosen reset-password flow.
   - Add scoped rate limiting for auth/write endpoints.
   - Return HTTP 429 with `{ error: "RATE_LIMIT", message: "..." }` and `Retry-After`.
   - Do not replace `apps/api/src/server.ts` wholesale.
5. Once Issue #138 is implemented, update AuthModal to call the backend route again.

## Rule

Read this file first. Do not read the whole repo or all docs.

After every meaningful code, QA, deploy, or handoff change, update this `AI_START_HERE.md` file before finishing.

## Source Of Truth Rules

GitHub production reference:

```text
https://github.com/aswer18400/QXwap
```

Local working copy that may contain unmerged work:

```text
/Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
```

Hard rules:

- Do not treat local as disposable.
- Do not treat GitHub as disposable.
- Do local-vs-GitHub diff before copying code.
- Cherry-pick only the needed change.
- Do not move the app back to any old structure.
- Do not rewrite large files unless there is no safer patch path.

## Pick The Smallest Context

| User asks for | Read next | Then inspect |
|---|---|---|
| Current project status | this file | `docs/ai-context/00-current-state.md` |
| Backend forgot/rate limit | Issue #138 | `apps/api/src/server.ts`, `apps/web/src/lib/api.ts`, auth tests/smoke scripts |
| Frontend auth UI | `apps/web/src/sheets/AuthModal.tsx` | `apps/web/src/lib/api.ts` |
| Status page / Pages deploy | `apps/web/public/status.html` | `.github/workflows/pages.yml`, web build config |
| Deploy/staging | `docs/deploy-day-runbook.md` | `render.yaml`, `package.json`, env examples |
| Manual QA | `docs/manual-qa.md` | target screen/component only |
| AI handoff/rules | `AGENTS.md` | `docs/ai-context/README.md` |

## Minimal Commands

Install/build/check:

```bash
pnpm install
pnpm run typecheck
pnpm run build
```

Frontend status check:

```bash
API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:full
```

Existing API smoke:

```bash
API_BASE_URL=https://qxwap-api.onrender.com/api pnpm smoke:api
```

Render env check:

```bash
DATABASE_URL=postgresql://... SESSION_SECRET=<secret> FRONTEND_ORIGIN=https://aswer18400.github.io NODE_ENV=production pnpm env:render
```

Deploy hook trigger, only if `RENDER_DEPLOY_HOOK_URL` is set intentionally:

```bash
RENDER_DEPLOY_HOOK_URL=https://... pnpm deploy:now
```

Conflict/whitespace check:

```bash
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

## Current Known Work

### Open Issue #138: backend forgot-password endpoint and rate limiting

This is the only active follow-up created by this handoff. Implement it in a small PR.

Acceptance criteria:

- Existing signup/signin behavior remains unchanged.
- Forgot-password UI can safely call the backend without 404/405.
- HTTP 429 responses produce frontend `RateLimitError`.
- `pnpm run typecheck` and relevant smoke checks pass.

### Production verification

After GitHub Pages and Render deploy:

- `https://aswer18400.github.io/QXwap/status.html` should load the static status page.
- `https://aswer18400.github.io/QXwap/` should still load the app.
- `https://qxwap-api.onrender.com/api/health` should return the QXwap API health payload.
- `https://qxwap-api.onrender.com/api/version` should return build/version info.

## Hard Constraints

- Do not deploy unless explicitly asked.
- Do not guess real secrets.
- Do not read the whole repo.
- Use `rg`/targeted file reads before opening large files.
- Do not replace `apps/api/src/server.ts` wholesale for Issue #138.
- Update this file after status, commands, risks, or next steps change.
