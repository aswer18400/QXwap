# QXwap Deploy Day Runbook

Open this file on deploy day and follow top to bottom. Each step has copy-paste commands and explicit markers for values you carry forward.

Estimated time: 60-90 minutes for first deploy.

Reference docs (do not open unless needed):
- `docs/staging-setup-guide.md` for topic-by-topic context.
- `docs/production-deployment-plan.md` for rationale and risks.
- `docs/ui-qa-checklist.md` for browser QA before deploy.

## Pre-Flight Gate (do on your Mac before touching cloud)

```bash
cd /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
API_BASE=https://<backend-domain>/api pnpm inject:web-api-base
BASE_PATH=/ API_BASE=https://<backend-domain>/api pnpm check:web-dist
rg -n "^<<<<<<<|^=======|^>>>>>>>" . || true
git diff --check
```

All must pass. If anything fails, fix it before continuing.

Also run `docs/ui-qa-checklist.md` end-to-end on `localhost:5173`. All three sections must pass.

## Values You Will Carry Forward

Keep this block in a scratch file (not committed). Fill in as you go.

```text
SUPABASE_PROJECT_REF=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STORAGE_BUCKET=qxwap
SESSION_SECRET=
RENDER_BACKEND_URL=
API_BASE_URL=
FRONTEND_ORIGIN=
```

Generate `SESSION_SECRET` now:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Paste the output into your scratch block as `SESSION_SECRET`. Keep it out of git.

---

## Step 1: Supabase Project

1. Go to https://supabase.com -> Sign in -> New Project.
2. Project name: `qxwap-staging` (or your preference).
3. Database password: generate strong, store in your password manager.
4. Region: closest to your users (e.g. Singapore for Thailand traffic).
5. Wait for provisioning to finish (~2 minutes).

After ready:

- Project Settings -> Database -> Connection string -> URI:
  - Copy as `DATABASE_URL`. Replace `[YOUR-PASSWORD]` with the real password.
  - Append `?sslmode=require` if not present.

- Project Settings -> API:
  - Copy `Project URL` -> paste as `SUPABASE_URL` (looks like `https://<ref>.supabase.co`).
  - Copy `service_role` key -> paste as `SUPABASE_SERVICE_ROLE_KEY`.
  - The `<ref>` part is `SUPABASE_PROJECT_REF`.

**Never** put the service role key in frontend code, GitHub repo variables visible to Pages, or screenshots.

## Step 2: Supabase Storage Bucket

1. Storage -> New bucket.
2. Name: `qxwap` (matches default `STORAGE_BUCKET`).
3. Public bucket: enabled.
4. File size limit: 6 MB.
5. Allowed MIME types: `image/png, image/jpeg, image/webp, image/gif`.
   The API smoke test uploads a tiny PNG image, so the bucket can stay image-only.
6. Create bucket.

Confirm by opening the bucket and seeing the empty list.

## Step 3: Choose Frontend Origin

Decide the production frontend URL now. Options:

- GitHub Pages: `https://<your-github-user>.github.io/<repo-name>/`
- Netlify/Vercel custom: `https://qxwap.example.com`

Paste into `FRONTEND_ORIGIN` (no trailing slash):

```text
FRONTEND_ORIGIN=https://aswer18400.github.io
```

Note: GitHub Pages origin is the bare github.io domain, not including the repo path. The browser sends the origin header without the path.

## Step 4: Render Backend Service

1. Go to https://render.com -> New -> Blueprint.
2. Connect your GitHub repo `aswer18400/QXwap`.
3. Render detects `render.yaml`. Confirm service name `qxwap-api`.
4. Before clicking Apply, fill in env vars in the Blueprint review screen:

```text
DATABASE_URL          = <from Step 1>
FRONTEND_ORIGIN       = <from Step 3>
SUPABASE_URL          = <from Step 1>
SUPABASE_SERVICE_ROLE_KEY = <from Step 1>
STORAGE_BUCKET        = qxwap
SESSION_SECRET        = <Render will auto-generate, or paste your scratch value>
NODE_ENV              = production (already in render.yaml)
```

5. Apply Blueprint. Render builds and deploys.
6. Wait for `Deploy live` status (~5-8 minutes first time).
7. Copy the service URL from Render dashboard (e.g. `https://qxwap-api-abcd.onrender.com`).

Paste into scratch:

```text
RENDER_BACKEND_URL=https://qxwap-api-abcd.onrender.com
API_BASE_URL=https://qxwap-api-abcd.onrender.com/api
```

## Step 5: Backend Smoke Test

From your Mac:

```bash
cd /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
curl --fail "$RENDER_BACKEND_URL/api/health"
```

Expected JSON:

```json
{
  "ok": true,
  "database": "connected",
  "required_tables": 18,
  "required_tables_expected": 18
}
```

If `required_tables` < `required_tables_expected`: the migration did not complete. Check Render logs.

If the URL 404s or 502s: wait 1 minute and retry; first cold start is slow.

Also confirm the commit that is actually deployed:

```bash
curl -s "$RENDER_BACKEND_URL/api/version" | python3 -m json.tool
```

Expected: `commit` matches the SHA you just pushed (first 40 chars of `git rev-parse HEAD`). If it shows an older SHA, the build did not pick up your commit — re-trigger from Render dashboard.

Now the full API smoke:

```bash
API_BASE_URL="$RENDER_BACKEND_URL/api" pnpm smoke:api
```

Expected: ends with `ok: true` JSON containing `item_id`, `offer_id`, `upload_url`. The `upload_url` must be a Supabase public URL (starts with `https://<ref>.supabase.co/storage/v1/object/public/qxwap/...`), not `/uploads/...`.

If `upload_url` starts with `/uploads/`: Supabase env was not picked up. Re-check Render env vars and Manual Deploy.

## Step 6: GitHub Pages Frontend

1. GitHub repo -> Settings -> Pages -> Source: GitHub Actions.
2. Settings -> Secrets and variables -> Actions -> Variables tab -> New repository variable:

```text
Name:  API_BASE_URL
Value: <your RENDER_BACKEND_URL>/api
```

Example: `https://qxwap-api-abcd.onrender.com/api`

3. Actions tab -> select `Deploy Pages` workflow -> Run workflow on `main` branch.
4. Wait for green check (~3-5 minutes).
5. Workflow output should include:
   - `[QXwap preflight] passed` with health check.
   - `[QXwap inject API base] passed`.
   - `[QXwap web dist check] passed`.

If preflight fails: read the error. Common issues:
- `/api/api` duplication: you put `/api/api` in `API_BASE_URL`. Fix to single `/api`.
- localhost in production: you used `http://localhost:8787/api`. Use the real Render URL.
- health failed: backend is down or `FRONTEND_ORIGIN` mismatch is blocking CORS.

## Step 7: Frontend Smoke (browser)

Open `https://<your-github-pages-url>` in fresh incognito at 390px:

- [ ] Feed loads with real items (not a blank screen, not localhost data).
- [ ] DevTools Network: requests go to `<RENDER_BACKEND_URL>/api/...` (not localhost).
- [ ] DevTools Console: no CORS errors, no `Mixed Content` warnings.
- [ ] Sign up with a throwaway email.
- [ ] Post an item with one image.
- [ ] Refresh page. Image URL still loads (Supabase public URL in img src).
- [ ] Sign out, sign in. Avatar/items still there.
- [ ] Open a second incognito, sign up as a different user.
- [ ] Open the first user's item from second account. No Edit/Delete button. Xwap button visible.
- [ ] Send Xwap offer with message+cash+credit.
- [ ] First account's Inbox shows the offer.

If any step fails, capture browser screenshot + Network panel screenshot + Render logs.

## Step 8: Lock Down

1. Supabase bucket -> Settings -> Allowed MIME types stay image-only: `image/png, image/jpeg, image/webp, image/gif`.
2. Render -> Environment -> confirm `SESSION_SECRET` is set, not `change-me-in-production`.
3. Render -> Settings -> Auto-Deploy: keep on if main branch is your stable line.
4. Verify Render dashboard shows `Healthy` status.
5. Take a database backup:
   - Supabase Dashboard -> Database -> Backups -> ensure daily backups are on. Trigger a manual snapshot before public launch.

## Step 9: Update Docs

Once green:

```bash
cd /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
```

Edit `docs/manual-qa.md`: tick GitHub Pages deployed site checkbox (line 32).

Edit `AI_START_HERE.md` `Current Known Next Work`: remove items 1-5 since deploy is done. Replace with operational items (monitoring, backup verification, user feedback channel).

Commit:

```bash
git add docs/manual-qa.md AI_START_HERE.md
git commit -m "docs: mark staging deploy verified"
git push
```

## Rollback (if Step 7 fails badly)

Backend:

- Render dashboard -> Manual Deploy -> select previous commit -> Deploy.
- Or set the service to `Suspend` to take it offline while debugging.

Frontend:

- GitHub Pages: re-run the previous successful workflow run from Actions tab.
- Or temporarily change `API_BASE_URL` to a known-good backend.

Database:

- Restore from Supabase backup. Test on a side database first if data loss is possible.

## When Things Go Wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| 502/504 from Render | First cold start | Wait 60s, retry |
| 401 on signin from prod | Cookie not set (insecure HTTPS mismatch) | Confirm Render is HTTPS, `FRONTEND_ORIGIN` exact match, no trailing slash |
| `Mixed Content` warning | API URL is http in https page | Set `API_BASE_URL` to https |
| Image 404 in prod | Supabase env missing in Render | Re-check three Supabase vars, manual deploy |
| `/api/api` in network | Double-normalization | Set `API_BASE_URL` to `<host>/api` only |
| Feed empty | DB migration incomplete | Check Render logs for migration error, fix DATABASE_URL |
| CORS preflight 403 | `FRONTEND_ORIGIN` mismatch | Set to exact origin: `https://<user>.github.io` (no path, no trailing slash) |

## Sign-off

```text
Deployed by: <name>
Date: <YYYY-MM-DD>
Backend URL: <Render URL>
Frontend URL: <Pages URL>
First production user: <email>
Smoke result: PASS / FAIL
Notes: <anything to remember>
```
