# QXwap Hot Cache

Last updated: 2026-05-25

## Current Project State

- Canonical source: `origin/main`
- Active sprint branch: `codex/ai-memory-workflow`
- Deploy rule: deploy from `main` only after review/merge

## Current Focus

- Keep this file as the latest high-signal handoff for future AI sessions
- Track active branch, draft PR, blockers, and next sprint

## Latest Known Good

- API health endpoint returns connected database state
- Standard validation target remains: typecheck, test, build before handoff

## Active Blockers / Risks

- This file must stay curated; do not turn it into a raw activity log
- Never store secrets, cookies, tokens, local credentials, or dashboard data here

## Recent Decisions

- `AGENTS.md` and `CLAUDE.md` now point AI sessions to this file first
- Historical context should be searched with `python3 session-store.py search "keyword"`

## Next Recommended Sprint

- Update this cache after each meaningful sprint with current branch, PR, blockers, and next steps
