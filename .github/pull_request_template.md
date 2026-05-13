# Summary

<!-- One sentence: what changed and why. -->

## Type

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor (no behavior change)
- [ ] Docs only
- [ ] Chore / CI / build

## Scope

- [ ] `apps/api` (backend)
- [ ] `apps/web` (frontend)
- [ ] `docs`
- [ ] `.github/workflows` (CI/deploy)
- [ ] `scripts` (preflight/smoke)
- [ ] Other: _____

## Local Verification

Run these and paste the result (or tick after running):

- [ ] `pnpm run typecheck` — passed
- [ ] `pnpm --filter @workspace/api-server test` — passed (count: ___)
- [ ] `pnpm --filter @workspace/api-server build` — passed
- [ ] `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build` — passed (if frontend touched)
- [ ] `rg -n '^<<<<<<<|^=======|^>>>>>>>' .` — no conflict markers
- [ ] If a user-visible flow changed, ran the relevant section of `docs/ui-qa-checklist.md`

## Schema / Migration

- [ ] No schema change
- [ ] New table/column added — migration in `apps/api/src/db.ts` is idempotent
- [ ] Migration tested on a fresh PGlite/Postgres
- [ ] `requiredTables` updated if a new table was added

## API Compatibility

- [ ] No public API change
- [ ] Added new endpoint (backwards compatible)
- [ ] Changed/removed endpoint — frontend already updated in this PR

## Deploy Risk

- [ ] Safe to roll forward only (no rollback drama)
- [ ] Requires new env var: _____
- [ ] Requires Render/Pages config change: _____
- [ ] Hot-fixable if it breaks
- [ ] Needs coordinated frontend + backend release

## Docs Updated

- [ ] `docs/manual-qa.md` updated if a user flow changed
- [ ] `AI_START_HERE.md` updated if status / risks / next-work changed
- [ ] `docs/deploy-day-runbook.md` updated if deploy steps changed
- [ ] N/A

## Linked Issue / Context

<!-- Link issue, Linear, or paste the user prompt that asked for this. -->

## Screenshots / Logs

<!-- Optional. Helpful for UI/UX or fixing a specific log line. -->

---

Reviewer: confirm at least every "Local Verification" box and "Deploy Risk" box is acknowledged before approving.
