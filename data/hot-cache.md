# QXwap Hot Cache

Last updated: 2026-05-25

## Current Project State

- Canonical source: `origin/main`
- Active sprint branch: `codex/session-store-snapshot-pass`
- Draft PR: https://github.com/aswer18400/QXwap/pull/223
- Deploy rule: deploy from `main` only after review/merge

## Current Focus

- Automate hot-cache maintenance with append/snapshot helpers
- Capture current PR #221 merge/deploy blockers in live project memory

## Latest Known Good

- session-store.py search works against project memory files
- typecheck/test/build remain the baseline closeout checks

## Active Blockers / Risks

- PR #221 is still draft and merge state is UNSTABLE
- Netlify preview effulgent-dragon-68def1 fails Header rules / Pages changed / Redirect rules
- No repo-level netlify.toml, _headers, or _redirects was found; the failing preview likely comes from an external or stale Netlify integration
- Deploy from main must wait for reviewer merge

## Recent Decisions

- AI sessions now read data/hot-cache.md first and can update it through session-store.py
- Hot cache should be updated at the end of every meaningful sprint
- Memory helpers now support search, append, and snapshot for repeatable sprint closeout

## Next Recommended Sprint

- Resolve or mark non-blocking the stale Netlify preview on PR #221
- Have a reviewer undraft/merge #221, then deploy from main and run production smoke

## Session Updates

- 2026-05-25 21:45 +07 — Started sprint to automate hot-cache updates and capture current merge/deploy blockers.
- 2026-05-25 21:46 +07 — Memory automation helpers added; PR #221 blocker recorded for merge/deploy handoff.
- 2026-05-25 21:52 +07 — Opened draft PR #223 for the hot-cache workflow and linked it into project memory.
