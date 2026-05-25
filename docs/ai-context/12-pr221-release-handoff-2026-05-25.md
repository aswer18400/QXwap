# PR #221 Release Handoff

Date: 2026-05-25  
PR: `#221` `Polish authenticated chat and offer detail density`

## Current Status

- GitHub Actions check `Typecheck / Test / Build` is green on PR `#221`.
- PR `#221` is still `draft`.
- `mergeStateStatus` is `UNSTABLE`.
- Netlify previews attached to the same PR are mixed:
  - `netlify/funny-flan-519795/deploy-preview` = `SUCCESS`
  - `netlify/kaleidoscopic-conkies-c3980f/deploy-preview` = `SUCCESS`
  - `netlify/effulgent-dragon-68def1/deploy-preview` = `FAILURE`

## What The Failure Likely Means

This repository does not contain repo-level Netlify config files:

- `netlify.toml`
- `_headers`
- `_redirects`

Because two Netlify previews on the same commit succeed while one site fails,
the remaining failure is most likely a site-specific or stale Netlify integration,
not a code regression inside PR `#221`.

## Owner / Site Maintainer Actions

Open the failing site in Netlify:

- `https://app.netlify.com/projects/effulgent-dragon-68def1`

Then do one of these:

1. If the site is stale:
   - Disconnect GitHub deploy notifications for this repo.
   - Or unlink this GitHub repo from that Netlify site entirely.

2. If the site is still active on purpose:
   - Inspect its site-level build settings.
   - Inspect site-level redirect rules.
   - Inspect site-level header rules.
   - Confirm there is no stale branch/build context tied to PR previews.

The key point: fix or remove the failing site integration, not the PR code.

## Reviewer Actions After Netlify Is Clean

1. Confirm the stale failing preview is gone or marked non-blocking.
2. Undraft PR `#221`.
3. Review and merge PR `#221` into `main`.

## Deploy From `main`

After merge:

1. Deploy backend:

```bash
curl -X POST "$RENDER_DEPLOY_HOOK_URL"
```

Or use the existing GitHub workflow path described in:

- `docs/remote-deploy-triggers.md`
- `docs/deploy-day-runbook.md`

2. Deploy frontend from `main`:
   - Run the Pages workflow from GitHub Actions
   - Or follow `docs/deploy-day-runbook.md`

## Production Smoke After Deploy

### API smoke

```bash
API_BASE_URL=https://<render-backend-domain>/api pnpm smoke:api
API_BASE_URL=https://<render-backend-domain>/api pnpm smoke:full
```

### Manual browser smoke

Open the live frontend and verify these routes:

- `home`
- `shop`
- `notifications`
- `profile_edit`
- `add`
- `chat`
- `offer_detail`

Use a fresh browser session and check:

1. Page loads without blank screen or shell fallback.
2. No console errors that block rendering.
3. Requests go to production backend, not localhost.
4. Guest gating behaves correctly where login is required.
5. Authenticated routes render populated data and primary actions complete.

### Minimum route checklist

- `home`: feed renders cards, no blank shell
- `shop`: product grid renders, filters/search visible
- `notifications`: list or empty state renders correctly
- `profile_edit`: authenticated form loads and sticky action bar is usable
- `add`: authenticated add flow loads and image/product steps are visible
- `chat`: thread renders, composer usable
- `offer_detail`: offer comparison and lower action flow render correctly

## If Deployment Still Needs Follow-up

Do the next safer step on a fresh branch from `main`:

- route-context logging improvements
- shell error boundary refinements
- extra production-only smoke coverage

Do not mix those changes into the merge of `#221`.
