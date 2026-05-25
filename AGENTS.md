# QXwap AI Working Rules

This repository must now be treated as the single source of truth.

## Source Of Truth

- GitHub `main` is canonical.
- Local folders are temporary working copies only.
- Do not treat old local folders as canonical project state.
- Do not copy from old local folders unless the user explicitly asks for a snapshot import.

## Sprint Rules

1. Fetch latest `origin/main`.
2. Create one branch per sprint.
3. Open Draft PR only.
4. Do not merge your own PR.
5. Do not force-push or rewrite `main`.
6. Do not touch PR #140 or PR #141.
7. Do not commit secrets, `node_modules`, `.data`, local uploads, cookies, or dashboard credentials.
8. Run typecheck/test/build before handoff.

## Where Code Lives

- Frontend: `apps/web`
- Backend/API/database/session/upload: `apps/api`
- Deployment scripts: `scripts`
- GitHub workflows: `.github/workflows`
- Supabase notes/config: `supabase`
- AI handoff: `AI_START_HERE.md` and `docs/ai-context`

## AI Memory Workflow

Before starting work each sprint:

1. Read `data/hot-cache.md` first for the latest project state.
2. If you need older context, search memory with:

```bash
python3 session-store.py search "keyword"
```

When closing a sprint:

1. Update `data/hot-cache.md`.
2. Prefer helper commands when available:

```bash
python3 session-store.py append "short sprint note"
python3 session-store.py snapshot --branch "branch-name" --pr "draft-pr-link" --focus "what changed" --blocker "current blocker" --next "next sprint"
```

## Handoff Required

Return:

- Branch name
- Draft PR link
- Diff/stat
- Commands run
- Failures or skipped checks
- Next recommended sprint
