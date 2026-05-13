# QXwap Staging Setup Guide

Use this guide when the owner is ready to create a real staging environment. Do not put real secrets in git.

## 1. Services

Recommended staging shape:

- Database: Supabase Postgres.
- Uploads: Supabase Storage public bucket.
- Backend: Render web service using `render.yaml`.
- Frontend: GitHub Pages using `.github/workflows/pages.yml`.

## 2. Supabase Project

Create or choose a Supabase project for staging.

Required values:

```text
DATABASE_URL=<Supabase Postgres connection string>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key, backend only>
STORAGE_BUCKET=qxwap
```

Template:

```text
.env.staging.example
```

Security notes:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code, GitHub Pages variables, screenshots, or Figma/docs.
- This app currently serves image URLs directly in the browser, so the `qxwap` storage bucket should be public for staging.
- If product privacy changes later, switch image serving to signed URLs before making the bucket private.

## 3. Storage Bucket

Create bucket:

```text
Name: qxwap
Public: enabled
```

Suggested upload limits:

```text
Max file size: 6 MB
Allowed MIME types: image/png, image/jpeg, image/webp, image/gif
```

Production note:

- The API smoke script uploads a tiny PNG image, so the bucket can stay image-only.
- The backend uploads through Supabase Storage REST API with the service role key, so browser users do not need direct Storage insert permissions for the current architecture.

## 4. Render Backend

Use:

```text
render.yaml
```

Render env values:

```text
NODE_ENV=production
DATABASE_URL=<from Supabase>
SESSION_SECRET=<long random secret>
FRONTEND_ORIGIN=https://<frontend-domain>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
STORAGE_BUCKET=qxwap
```

Generate a session secret:

```bash
pnpm secret:session
```

Paste the output into Render as `SESSION_SECRET`. Do not save the generated value in git.

Render should expose:

```text
https://<render-service>/api/health
```

After deploy:

```bash
API_BASE_URL=https://<render-service>/api pnpm preflight:frontend
API_BASE_URL=https://<render-service>/api pnpm smoke:api
```

## 5. GitHub Pages Frontend

Set repository variable or secret:

```text
API_BASE_URL=https://<render-service>/api
```

Only `API_BASE_URL` should be needed by GitHub Pages. Do not add backend secrets to GitHub Pages frontend variables.

Workflow:

```text
.github/workflows/pages.yml
```

The workflow:

- Normalizes API base to one `/api`.
- Runs API health preflight.
- Builds with `BASE_PATH=/<repo-name>/`.
- Injects `window.API_BASE`.
- Checks built asset paths and API injection.

## 6. Staging Smoke Checklist

Run:

```bash
pnpm install
pnpm run typecheck
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
DATABASE_URL=postgresql://... SESSION_SECRET=<secret> FRONTEND_ORIGIN=https://<frontend-domain> NODE_ENV=production pnpm preflight:backend
API_BASE_URL=https://<render-service>/api pnpm preflight:frontend
API_BASE_URL=https://<render-service>/api pnpm smoke:api
```

Manual browser checks:

- Open frontend staging URL.
- Feed loads real items.
- Signup/signin work.
- Upload product image renders in Feed, Shop, Detail.
- Profile photo upload persists after refresh/re-login.
- Xwap sends offer for user with no products.
- Inbox received offer appears.
- Accept offer starts shipment flow.

## 7. Rollback

Backend:

- Roll back Render to previous deploy.
- Keep database backups before launch.

Frontend:

- Redeploy previous GitHub Pages artifact.
- Confirm `window.API_BASE` points to the intended backend.

## 8. References

- Supabase changelog: https://supabase.com/changelog
- Supabase Storage buckets: https://supabase.com/docs/guides/storage/buckets/creating-buckets
- Supabase public asset serving: https://supabase.com/docs/guides/storage/serving/downloads
