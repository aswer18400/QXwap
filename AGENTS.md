# QXwap AI Working Rules

This file is the contract for Codex, Claude Code, OpenClaw, and any other AI agent working in this repository.

## Start Here

1. Read `AI_START_HERE.md`.
2. Pick exactly one task card in `docs/ai-context/`.
3. Inspect only the files named by that task card before editing.
4. Update `AI_START_HERE.md` before handing work back.

## Source Of Truth

- GitHub `main` is the production code reference.
- Work from a fresh branch based on the latest `origin/main`.
- Local scratch folders may contain newer experiments, but they are not source of truth until cherry-picked into a reviewed branch.
- Never copy a whole local folder over the repository.

## Branch And PR Rules

- One sprint equals one branch and one Draft PR.
- Branch names use `sprint/<short-task-name>`.
- Do not touch PR #140 or PR #141.
- Do not merge your own PR.
- Do not deploy unless the user explicitly asks.
- Return a real PR link, command results, and `git diff --stat`.

## Protected Paths

- Do not edit `QXwap-full-orchestrated/**`.
- Do not commit secrets, dashboard credentials, `.env`, cookies, screenshots with secrets, or production database URLs.
- Do not stage unrelated local-only workspace files such as `.openclaw/**`, personal agent identity files, or temporary artifacts.

## Code Ownership

- Frontend app: `apps/web`.
- Backend/API app: `apps/api`.
- Shared development scripts: `scripts`.
- Design tokens and Figma-ready design system: `apps/web/src/design-system`.
- AI task cards and handoff docs: `docs/ai-context`.

## Editing Rules

- Keep changes scoped to the active sprint.
- Prefer small patches over rewrites.
- Do not change backend/database for frontend-only work.
- Do not change frontend UI for backend-only work.
- Delete files only when they are not imported, not referenced by active docs, and not part of deployment/test scripts.
- If deletion is uncertain, document it in the task card instead of deleting it.

## Required Checks Before Handoff

Run the narrowest checks that cover the touched area:

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

If a check is skipped, explain why.

## Handoff Format

Always report:

- Sprint/branch name.
- Draft PR link.
- Files changed.
- Diff stat.
- Commands run and pass/fail status.
- Known remaining risks.
- Next recommended sprint.
