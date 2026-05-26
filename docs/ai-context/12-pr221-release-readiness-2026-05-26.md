# PR #221 Release Readiness Check

Use this when the team wants a single command to answer:

- Is PR `#221` still blocked?
- Is the blocker inside repo CI or outside the repo?
- Are we ready to undraft/merge and deploy?

## Command

```bash
pnpm check:release-pr -- --pr 221
```

Or:

```bash
PR_NUMBER=221 pnpm check:release-pr
```

## What It Checks

The script reads PR metadata through `gh` and summarizes:

- draft state
- merge state
- review state
- assignees
- failing non-Netlify checks
- failing Netlify checks
- successful sibling Netlify previews

## Why This Matters For `#221`

Right now, `#221` is blocked by a single Netlify site:

- `netlify/effulgent-dragon-68def1/deploy-preview`

But sibling Netlify previews on the same PR are already healthy. That usually
means the remaining failure is stale or site-specific, not a code regression
inside the PR.

## When The Script Returns Ready

If the script exits with success, the path is:

1. reviewer undrafts/merges `#221`
2. deploy from `main`
3. run:

```bash
API_BASE_URL=https://<render-backend-domain>/api \
FRONTEND_URL=https://<frontend-domain>/QXwap/ \
pnpm smoke:release
```

## If It Still Returns Blocked

The next action is usually outside the repo:

1. owner/site maintainer opens the failing Netlify site
2. disconnects it if stale
3. or fixes site-level build/header/redirect config if it is still active
