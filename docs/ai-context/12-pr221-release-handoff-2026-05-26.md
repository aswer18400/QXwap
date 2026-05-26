# PR #221 Release Handoff

Date: 2026-05-26  
PR: `#221` `Polish authenticated chat and offer detail density`

## Current Status

- GitHub Actions check `Typecheck / Test / Build` is green on PR `#221`.
- PR `#221` is still `draft`.
- `mergeStateStatus` is `UNSTABLE`.
- Only one Netlify preview is failing:
  - `netlify/effulgent-dragon-68def1/deploy-preview`
- Two sibling Netlify previews on the same commit are already green:
  - `netlify/funny-flan-519795/deploy-preview`
  - `netlify/kaleidoscopic-conkies-c3980f/deploy-preview`

## Owner / Site Maintainer

Open:

- `https://app.netlify.com/projects/effulgent-dragon-68def1`

Then:

1. If this site is stale:
   - disconnect GitHub deploy notifications for this repo
   - or unlink the repo from the site entirely
2. If this site is still active:
   - inspect site-level build settings
   - inspect site-level header rules
   - inspect site-level redirect rules
   - clear any stale PR preview/build context tied to this repo

Because the repo does not define `netlify.toml`, `_headers`, or `_redirects`,
this remaining failure is most likely external to the PR code.

## Reviewer

After the stale/failing Netlify site is cleared or marked non-blocking:

1. Undraft PR `#221`
2. Review and merge into `main`

## Deploy From `main`

After merge:

1. Deploy backend
2. Deploy frontend from `main`

References:

- `docs/deploy-day-runbook.md`
- `docs/remote-deploy-triggers.md`

## Production Smoke

Use the one-command release smoke:

```bash
API_BASE_URL=https://<render-backend-domain>/api \
FRONTEND_URL=https://<frontend-domain>/QXwap/ \
pnpm smoke:release
```

What it does:

1. Checks `/api/health`
2. Checks `/api/version`
3. Runs `pnpm smoke:api`
4. Runs `pnpm smoke:full`
5. Fetch-checks frontend shell availability on:
   - `home`
   - `shop`
   - `notifications`
   - `profile_edit`
   - `add`
   - `chat`
   - `offer_detail`

## If Smoke Fails

Do not mix new fixes into the merge of `#221` directly.

Instead:

1. Keep `main` as the release truth
2. Open a fresh follow-up branch from `main`
3. Fix only the failing production issue
4. Re-run `pnpm smoke:release`
