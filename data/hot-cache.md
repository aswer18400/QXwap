# QXwap Hot Cache

Last updated: 2026-05-25

## Current Project State

- Canonical source: `origin/main`
- Active sprint branch: `codex/netlify-preview-blocker-pass`
- Draft PR: _(not set)_
- Deploy rule: deploy from `main` only after review/merge

## Current Focus

- Triage the failing Netlify preview that blocks PR #221
- Record merge/deploy handoff context so the next sprint can continue safely

## Latest Known Good

- GitHub Actions check `Typecheck / Test / Build` on PR #221 is green
- Two Netlify previews on PR #221 are green: `funny-flan-519795` and `kaleidoscopic-conkies-c3980f`

## Active Blockers / Risks

- PR #221 is still a draft and merge state is `UNSTABLE`
- `netlify/effulgent-dragon-68def1/deploy-preview` is the only failing preview on PR #221
- This repo does not define `netlify.toml`, `_headers`, or `_redirects`, so the failing preview likely comes from a site-specific or stale Netlify integration
- Deploy from `main` must wait for reviewer merge

## Recent Decisions

- Treat the failing `effulgent-dragon-68def1` preview as an external integration blocker until a Netlify site owner inspects or disconnects it
- Keep merge/deploy work gated behind reviewer action instead of forcing a local workaround

## Session Updates

- 2026-05-25 22:03 +07 — Confirmed PR #221 repository CI is green and only one of three Netlify previews is failing.
- 2026-05-25 22:04 +07 — Posted an actionable PR comment pointing the reviewer to disconnect or inspect `effulgent-dragon-68def1`.

## Next Recommended Sprint

- Resolve or mark non-blocking the stale Netlify preview on PR #221
- Have a reviewer undraft/merge #221
- After merge, deploy from `main` and run production smoke on `home`, `shop`, `notifications`, `profile_edit`, `add`, `chat`, and `offer_detail`
