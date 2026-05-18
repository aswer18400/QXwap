# QXwap AI Fast Start

Read this file only. Open other docs only when the task needs them.

## Source Of Truth

- Use GitHub `main` only: `https://github.com/aswer18400/QXwap`
- Current canonical commit: `9c8433e0 Update canonical AI handoff status`
- Old branches/PRs/local folders are not source of truth.
- Do not restore `QXwap-full-orchestrated/**`, old `gh-pages`, or deleted prototype branches.

## Work Rules

- Start every task from latest `origin/main`.
- Create one new branch per sprint/task.
- Open Draft PR only. Do not merge unless user explicitly says so.
- Keep structure: `apps/web`, `apps/api`, `docs`, `scripts`, `supabase`.
- Update this file only when the canonical repo state changes, not for small task notes.

## Common Commands

- API dev: `PGLITE_DATA_DIR=.data/qxwap-pglite-parity pnpm --filter @workspace/api-server dev`
- Web dev: `PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0`
- Fast check: `pnpm run typecheck`
- Full check before handoff: see `docs/ai-workflow-reference.md`

## Need More Detail?

- Full workflow/runbook: `docs/ai-workflow-reference.md`
- Project overview: `README.md`
- Repo rules for agents: `AGENTS.md`
