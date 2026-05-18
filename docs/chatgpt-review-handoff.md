# QXwap — Cross-Review Handoff for ChatGPT

Paste this whole file into ChatGPT and ask: "Cross-review my QXwap codebase
for gaps and risks. Be specific and skeptical." This is a snapshot for an
external reviewer who has not seen the code, only this document.

## Verified Live State (as of this handoff)

GitHub source of truth:

```text
<repo-root>
```

GitHub: https://github.com/aswer18400/QXwap (source of truth).

Deployed:

```text
Frontend: https://aswer18400.github.io/QXwap/   (GitHub Pages)
Backend:  https://qxwap-api.onrender.com         (Render service srv-d7mfphu7r5hc73868seg)
```

Prod backend is **NOT verified yet**. Probing on the latest handoff:

```text
GET https://qxwap-api.onrender.com/         → text/html, <title>QXwap</title>
GET https://qxwap-api.onrender.com/api/health   → {"ok":true}   (missing name/database/required_tables)
GET https://qxwap-api.onrender.com/api/version  → empty body / 404
```

That payload does not match the API we built. Likely cause: Render service
has manually-set Build/Start/Root Directory that doesn't match `render.yaml`
in the repo. Pending fix in §"Open Risks".

## Architecture

```text
apps/api  Express + express-session + DbSessionStore + PGlite/Postgres
          via apps/api/src/db.ts (idempotent migration on boot)
          18 required tables; auth via bcrypt + cookie session
          Upload: Supabase Storage when env set, else local disk fallback
          /api/version exposes git commit + build time + node version

apps/web  React + Vite, served as static from GitHub Pages
          window.API_BASE injected at deploy time by pages.yml
          credentials: include for cookies across origin

scripts   qxwap-preflight.mjs     env + URL sanity (run in CI)
          qxwap-api-smoke.mjs     end-to-end: signup → upload → item → offer
          qxwap-web-dist-check.mjs verifies built dist has BASE_PATH + window.API_BASE
```

## Test Coverage (apps/api/tests/api.test.ts)

10 vitest tests passing locally:

1. `/api/health` serves seeded items; `?q=iPad` returns matches.
2. `/api/version` exposes commit/node/builtAt/startedAt.
3. `x-request-id` is emitted on every response; client-supplied id is forwarded
   when it matches `/^[\w.-]{1,128}$/`, otherwise replaced.
4. `POST /api/auth/signin` with wrong password returns 401.
5. A user with zero items can send an Xwap offer with message + cash + credit;
   target owner can reject with a reason.
6. Upload + create item persists images and wanted_tags through the API.
7. Profile avatar persists after signout + sign-in.
8. Owner-only edit/delete: non-owner PATCH/DELETE on `/api/items/:id` returns
   403; `viewer.is_owner` is correct for owner/non-owner/guest.
9. Search/filter: title, description, wanted_text (Thai), wanted_tag,
   category, condition, deal_type, combined AND, price range, open_to_offers,
   no-match returns empty.
10. (Combined query — covered in same test as #9.)

## Frontend QA (not yet exercised in browser at production URL)

`docs/ui-qa-checklist.md` defines 27 click-through steps across:

- Owner gating: owner creates → sees Edit/Delete; non-owner does not; guest
  cannot edit/delete; non-owner PATCH/DELETE via DevTools returns 403.
- Search/filter: title/description/wanted_text/no-match, category rail,
  search+category AND, FilterSheet combos, sort, wanted-tag deep link.
- Profile photo: upload → save → refresh → signout → sign-in persistence;
  cross-session visibility; `/uploads/...` (dev) vs Supabase public URL (prod).

These are local-only verified at this point. Production browser smoke is
blocked on Render fix.

## CI / Deploy Hardening

`.github/workflows/ci.yml` runs on every PR + push to main:

- pnpm install (frozen lockfile)
- conflict-marker grep (only `<<<<<<<` / `>>>>>>>`; `=======` excluded due to
  markdown setext H1 false positives)
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server test`
- API + web build
- Backend preflight in production mode with a generated session secret
- Frontend preflight against `https://example.invalid/api`
- Web-dist BASE_PATH check

`.github/workflows/pages.yml` deploys frontend with `API_BASE_URL` repo var.

`.github/dependabot.yml` — weekly npm updates Mon 08:00 Bangkok, monthly
GH Actions, grouped `@types/*` + dev-deps.

`.github/CODEOWNERS` routes review to `@aswer18400`.

`.github/pull_request_template.md` enforces verification + deploy-risk
acknowledgment.

## Observability

- Every API response carries `x-request-id` (UUID or forwarded valid client id).
- Logs are single-line JSON in production:
  `{ ts, level, requestId, method, path, status, durationMs, userId, ua }`.
- Error responses include `requestId` in the body, so a user's screenshot
  pinpoints the log line.
- `/api/health` and `/api/version` 2xx responses are filtered out of logs to
  avoid health-probe spam; non-2xx still log.

## Documents (low-token entrypoints)

- `AI_START_HERE.md` — first file every AI/dev reads.
- `docs/ai-context/00-current-state.md` — quick status.
- `docs/ai-context/05-deploy-next.md` — deploy pointers.
- `docs/manual-qa.md` — 28 user-flow checks, current ticked state.
- `docs/ui-qa-checklist.md` — browser click-through QA before deploy.
- `docs/deploy-day-runbook.md` — 9-step linear deploy.
- `docs/staging-setup-guide.md` — topic reference for Supabase + Render + Pages.
- `docs/production-deployment-plan.md` — rationale + risks.
- `docs/ops-runbook.md` — post-launch incident response.
- `SECURITY.md` — vulnerability disclosure.

## Open Risks (please cross-review)

1. **Render backend not actually our API.** Probing showed the service
   returns frontend HTML at `/` and `{"ok":true}` at `/api/health`. Fix is to
   align Render dashboard Build/Start/Root Directory with `render.yaml` and
   Manual Deploy with cleared cache. See `docs/ops-runbook.md` §4.1.

2. **Supabase env not configured.** `DATABASE_URL`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET` need to be set in Render.
   Without `DATABASE_URL` the API will fail-fast on boot per
   `validateRuntimeConfig`.

3. **Local disk fallback for uploads.** When Supabase env is unset, uploads
   land in `apps/api/uploads/` which Render wipes on every deploy. Acceptable
   in dev, **never** in prod.

4. **Cookie security in production.** Server sets `SameSite=None; Secure=true`
   only when `NODE_ENV=production`. If Render env doesn't set
   `NODE_ENV=production`, cross-origin login from GitHub Pages will silently
   fail.

5. **`FRONTEND_ORIGIN` exact match.** CORS allowlist is split on comma.
   Set to `https://aswer18400.github.io` (origin only, no path, no trailing
   slash).

6. **PGlite vs Postgres parity.** Local tests use PGlite, prod is Supabase
   Postgres. SQL is identical but some advisory features (e.g. `array_agg
   FILTER`) need verification against Postgres on first deploy. Smoke test
   `pnpm smoke:api` against the real backend covers this.

7. **Public storage bucket.** Current design serves images via Supabase public
   URLs directly in `<img>` tags. If we ever need private items, switch to
   signed URLs before flipping the bucket to private.

8. **No rate limiting on `/api/auth/signup`.** A determined attacker could
   create many accounts. Tolerable for staging; add limits before public
   launch.

9. **No CSRF mitigation beyond `SameSite`.** Mutating endpoints rely on
   cookies + same-site for protection. If we ever add a CORS allowlist with
   multiple origins, revisit.

10. **No request body size limit on `/api/upload`.** Express `json` is capped
    at 8 MB; multer is capped at 6 MB per file × 8 files = 48 MB per request.
    Acceptable but document for ops.

## Specific Questions for the Reviewer

- Are the 10 backend tests sufficient for the surface area? Anything obviously
  missing? (Suggested: rate-limit test, CSRF test, large upload reject test.)
- Does the `x-request-id` allowlist regex `^[\w.-]{1,128}$` create any practical
  problem with common tracing systems (e.g. W3C traceparent `00-...-...-01`)?
  The hyphen is allowed; total length is short — could a real traceparent fit?
- The `FilterSheet` combines client-side state with server-side query
  generation in `App.tsx:81-98`. Is the URLSearchParams round-trip safe with
  user-controlled Thai input (encoding, length)?
- Migration in `apps/api/src/db.ts` is idempotent but not versioned. Is that
  OK for a pre-1.0 app, or should we adopt a migration tool now?
- Anything in `render.yaml` that is fragile to Render product changes (e.g.
  the `corepack prepare` line)?
- Anything in `.github/workflows/pages.yml` that would fail if the repo were
  forked / renamed?

Please respond as a reviewer who is skeptical of every claim until proven by a
file path or a test name.
