# QXwap Evaluation Checklist

## Setup

- [x] `npm install` completes.
- [x] `.env.example` can be copied to `.env` for local development.
- [x] `npm run db:push` applies schema to local PGlite.
- [x] `npx tsx db/seed.ts` runs successfully and creates demo data.
- [x] `tsx` is available through project dependencies.

## Code Health

- [x] `npm run check` passes.
- [x] `npm run lint` passes with warnings only.
- [x] `npm run test` passes.
- [x] `npm run build` passes.

Known lint warnings remain for broad `any` usage, shadcn fast-refresh exports, and React hook style checks. They are warnings so deploys are not blocked, but they should be tightened during a later type-cleanup pass.

## Production API And Database

- [x] `/api/health` returns `{"ok":true}`.
- [x] `/api/ready` returns `database:true`.
- [x] CORS fallback origin is `https://aswer18400.github.io`.
- [x] Auth/session routes use the configured API base.
- [x] tRPC routes use the configured API base.
- [x] Uploads use the configured API base instead of a hard-coded GitHub Pages `/api/upload`.

## Frontend Runtime

- [x] GitHub Pages basename is `/QXwap/`.
- [x] Manifest is loaded from `/QXwap/manifest.json`.
- [x] Service worker is registered from the active base path.
- [x] Old service workers and browser caches are cleared to prevent stale old/new bundle mixing.
- [x] Protected routes wait for auth state before rendering.
- [x] Login/signup show loading and error states.
- [x] Add Product draft is saved locally until a successful create.
- [x] Chat input adjusts for mobile visual viewport changes.

## Remaining Follow-Up

- [ ] Replace remaining `any` types with router-derived or local view model types.
- [ ] Refactor generated UI exports if fast-refresh warnings should become errors.
- [ ] Add browser automation coverage for login, create listing, upload, offer, chat, wallet, and notifications.
- [ ] Add production smoke workflow coverage for authenticated feature endpoints beyond health/readiness/auth.
