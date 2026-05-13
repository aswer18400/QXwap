# QXwap Production Action Board

Use this file when finishing the Render + Supabase + GitHub Pages launch. It is intentionally short so another AI or browser operator can continue without reading the full repo.

## Current Local Gate

Run before touching cloud:

```bash
cd /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to
pnpm gate:production
```

For the real backend URL after Render is live:

```bash
API_BASE=https://<render-service>.onrender.com/api \
API_BASE_URL=https://<render-service>.onrender.com/api \
FRONTEND_ORIGIN=https://aswer18400.github.io \
BASE_PATH=/QXwap/ \
pnpm gate:production
```

Then run against the live API:

```bash
API_BASE_URL=https://<render-service>.onrender.com/api pnpm preflight:frontend
API_BASE_URL=https://<render-service>.onrender.com/api pnpm smoke:api
```

## Values To Fill In

Keep real values in a password manager or dashboard only. Do not commit them.

```text
SUPABASE_PROJECT_REF=
DATABASE_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STORAGE_BUCKET=qxwap
SESSION_SECRET=
RENDER_BACKEND_URL=
API_BASE_URL=
FRONTEND_ORIGIN=https://aswer18400.github.io
GITHUB_PAGES_URL=https://aswer18400.github.io/QXwap/
```

Generate `SESSION_SECRET`:

```bash
pnpm -s secret:session
```

## Supabase

1. Project exists.
2. Copy Postgres URI into `DATABASE_URL`; include `sslmode=require`.
3. Copy Project URL into `SUPABASE_URL`.
4. Copy service role key into `SUPABASE_SERVICE_ROLE_KEY`; backend only.
5. Storage bucket:

```text
Name: qxwap
Public: enabled
Allowed MIME: image/png, image/jpeg, image/webp, image/gif
Max file size: 6 MB
```

## Render

Use `render.yaml`.

Required env:

```text
NODE_ENV=production
DATABASE_URL=<Supabase Postgres URI>
SESSION_SECRET=<generated secret>
FRONTEND_ORIGIN=https://aswer18400.github.io
SUPABASE_URL=<Supabase Project URL>
SUPABASE_SERVICE_ROLE_KEY=<backend-only service role key>
STORAGE_BUCKET=qxwap
```

After deploy:

```bash
curl --fail https://<render-service>.onrender.com/api/health
curl -s https://<render-service>.onrender.com/api/version
API_BASE_URL=https://<render-service>.onrender.com/api pnpm smoke:api
```

Production upload success means `upload_url` starts with:

```text
https://<project-ref>.supabase.co/storage/v1/object/public/qxwap/
```

If it starts with `/uploads/`, Render did not receive Supabase storage env.

## GitHub Pages

Repository: `aswer18400/QXwap`.

Settings:

```text
Pages source: GitHub Actions
Actions variable API_BASE_URL=https://<render-service>.onrender.com/api
```

Workflow:

```text
.github/workflows/pages.yml
```

Expected workflow markers:

```text
[QXwap preflight] passed
[QXwap inject API base] passed
[QXwap web dist check] passed
```

## Final Browser QA

Open:

```text
https://aswer18400.github.io/QXwap/
```

Check:

- Feed loads from Render API, not localhost.
- Signup/signin works.
- Add product with image works.
- Product image persists after refresh.
- Profile photo persists after refresh/re-login.
- Non-owner does not see Edit/Delete.
- User with no products can send Xwap with message, cash, and credit.
- Inbox received offer appears.
- Accept/reject/cancel/confirm works.
- Mobile Chrome 390px has no horizontal scroll.

## If A Browser/Claude Code Agent Takes Over

Read only:

```text
AI_START_HERE.md
docs/production-action-board.md
render.yaml
.github/workflows/pages.yml
```

Do not read all docs unless a step fails.
