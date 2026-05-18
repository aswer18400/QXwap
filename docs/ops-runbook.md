# QXwap Ops Runbook

Use this when prod is up and you (or future on-call) need to know what to do
when something looks wrong.

Production URLs:

```text
Frontend: https://aswer18400.github.io/QXwap/
Backend:  https://qxwap-api.onrender.com
Render service id: srv-d7mfphu7r5hc73868seg
```

## 1. Health Signals (check these first)

```bash
curl -s https://qxwap-api.onrender.com/api/health | python3 -m json.tool
curl -s https://qxwap-api.onrender.com/api/version | python3 -m json.tool
```

What "healthy" looks like:

```json
{
  "ok": true,
  "name": "QXwap API",
  "database": "connected",
  "required_tables": 18,
  "required_tables_expected": 18,
  "items": <number>,
  "time": "<ISO>"
}
```

```json
{
  "commit": "<40-char SHA matching latest main>",
  "branch": "main",
  "builtAt": "<ISO close to deploy time>",
  "node": "v22.x",
  "env": "production",
  "startedAt": "<ISO>"
}
```

If `/api/health` does not include `name`, `database`, or `required_tables`, the
Render service is **not** running the QXwap API. Jump to §4.1.

If `commit` does not match `git rev-parse HEAD` on `main`, the latest commit
has not deployed. Jump to §4.2.

## 2. On-Call Quick Start

When paged or noticing an outage:

1. Open Render dashboard: https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg
2. Tab: Events → look for failed deploys in the last 30 minutes.
3. Tab: Logs → filter `level=error` or grep for the `requestId` from the user
   report. Every API response carries `x-request-id`; ask the affected user
   for it (or pull it from the error body).
4. Check Supabase status: https://status.supabase.com/
5. Check Render status: https://status.render.com/
6. If you have a probable cause, jump to §4. Otherwise §5.

## 3. Pull a Specific User's Trace

The API logs are single-line JSON in production. Every line has `requestId`.

In Render Logs UI:

```text
search: requestId="<id-from-user>"
```

You will see method, path, status, durationMs, userId, ua. Errors include the
exception name and message on a separate line with `level=error`.

## 4. Common Incidents

### 4.1 `/api/health` returns wrong payload (not the QXwap API)

Symptom: `/api/health` returns `{"ok":true}` only, or HTML, or 404 on
`/api/version`.

Likely cause: Render service has manually configured Build/Start/Root Directory
that does not match `render.yaml`. Render does not auto-apply blueprint changes
to an existing service.

Fix:

1. Render dashboard → Settings.
2. Confirm:
   - **Root Directory**: empty (or `.`).
   - **Build Command**:
     ```text
     corepack prepare pnpm@9.15.4 --activate
     pnpm install --frozen-lockfile --prod=false
     pnpm --filter @workspace/api-server build
     ```
   - **Start Command**:
     ```text
     pnpm --filter @workspace/api-server start
     ```
   - **Health Check Path**: `/api/health`
3. Save changes. Then Manual Deploy → Clear build cache → Latest commit.
4. Watch the build log. The build must compile `apps/api/src` with `tsc` and
   the start command must run `node dist/src/server.js`.
5. After deploy succeeds: re-run §1 and confirm `name: "QXwap API"`.

### 4.2 `/api/version.commit` does not match latest main SHA

Symptom: a fix was pushed but `commit` is the previous SHA.

Likely cause: deploy in flight, deploy failed, or auto-deploy disabled.

Fix:

1. Render → Events tab → check latest deploy status.
2. If "Deploy live" but stale SHA: Render did not detect the commit. Manual
   Deploy from the dashboard.
3. If "Build failed": open Logs and fix the cause. Common causes:
   - Missing dev type in `dependencies` → move to `dependencies`.
   - `corepack enable` requires privilege Render no longer grants — use
     `corepack prepare pnpm@9.15.4 --activate` instead.
4. If "Build canceled": re-trigger.

### 4.3 `database` not `"connected"` on /api/health

Likely causes:

- Supabase project is paused (free tier auto-pauses after inactivity).
- `DATABASE_URL` rotated and not yet updated in Render.
- Supabase Postgres at capacity.

Fix:

1. Supabase dashboard → confirm project status.
2. Render → Environment → check `DATABASE_URL` matches the current Supabase
   connection string. Append `?sslmode=require` if missing.
3. Render → Manual Deploy after env change.

### 4.4 Image upload fails / image 404 in browser

Likely cause: Supabase Storage env vars are out of sync.

Fix:

1. Render → Environment → confirm all three:
   - `SUPABASE_URL` (https://<ref>.supabase.co, no trailing slash)
   - `SUPABASE_SERVICE_ROLE_KEY` (service role, not anon)
   - `STORAGE_BUCKET=qxwap`
2. Supabase → Storage → confirm bucket `qxwap` exists and is public.
3. Reproduce the upload locally with the same env; the server logs will print
   the Supabase REST response.

If env vars are missing entirely the API falls back to `/uploads/...` on local
disk. Render's disk is ephemeral, so this means images will disappear on every
deploy. Set the env vars before launch.

### 4.5 Login fails on prod (works locally)

Likely causes:

- `FRONTEND_ORIGIN` does not exactly match the deployed frontend origin.
- Cookies blocked by `SameSite=None` + non-HTTPS combination.

Fix:

1. Render → Environment → `FRONTEND_ORIGIN`. Must be exactly
   `https://aswer18400.github.io` (no path, no trailing slash).
2. Confirm both frontend and backend are HTTPS.
3. Confirm `NODE_ENV=production` so the server sets `secure: true` cookies.

### 4.6 CORS preflight fails (`Origin ... is not allowed`)

Same fix as §4.5. The CORS allowlist is `FRONTEND_ORIGIN.split(",")`, so a
mismatch in scheme, host, or port shows up here first.

### 4.7 502 / 504 from Render

Cold start can take 30-60 seconds on the free/standard plan. Retry once.

If persistent: Render → Logs. Look for an unhandled rejection on boot or a DB
connection timeout. Recent boot-time validators (`validateRuntimeConfig`,
`migrate`, `seed`) exit non-zero on bad config — that will show as `Deploy
live` followed by repeated process exits.

## 5. Escalation

If §4 does not cover the symptom:

1. Take a screenshot of the Render Logs error.
2. Capture the affected user's `requestId` (response header).
3. Capture `curl /api/health` and `curl /api/version` output.
4. Email `sarun012345@gmail.com` with all of the above.
5. If the problem is in Supabase / Render infra (their status page is red):
   wait for upstream. Post an internal note in `docs/incidents/`.

## 6. Rollback

Backend:

- Render dashboard → Deploys → previous successful deploy → "Redeploy this
  commit".

Frontend:

- GitHub Actions → "Deploy QXwap Web" → previous successful run → "Re-run all
  jobs".

Database:

- Supabase dashboard → Database → Backups → restore to a side-database first,
  verify, then point production at the restored database (env var swap +
  redeploy).

## 7. Post-Incident

After resolving:

1. Create `docs/incidents/YYYY-MM-DD-<short-title>.md` with: what broke, how
   we noticed, what we did, root cause, prevention.
2. Update this runbook if a new failure mode emerged.
3. If a code change is needed, open a PR with the postmortem linked.
