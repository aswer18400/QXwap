# QXwap Setup Guide

## Current Production Status

- Frontend: `https://aswer18400.github.io/QXwap/`
- API: `https://qxwap-api.onrender.com/api`
- Readiness check: `GET https://qxwap-api.onrender.com/api/ready`
- Expected ready response: `{"ok":true,"database":true,...}`

The production API is configured for a real PostgreSQL database when `DATABASE_URL` is a PostgreSQL connection string and `FRONTEND_ORIGIN=https://aswer18400.github.io`.

## Local Setup

```bash
npm install
cp .env.example .env
npm run db:push
npx tsx db/seed.ts
npm run dev
```

Default local `.env.example` uses PGlite at `./data/pglite`, so local development does not require a cloud database.

## Validation Commands

```bash
npm run check
npm run lint
npm run test
npm run build
```

`npm run lint` is configured to fail on true errors while reporting compatibility/style issues as warnings. This keeps CI useful for the current shadcn/generated UI codebase without blocking deploys on existing non-runtime warnings.

## Production Notes

- Do not commit real secrets.
- Render must provide `DATABASE_URL`, `SESSION_SECRET`, and `FRONTEND_ORIGIN`.
- GitHub Pages build injects `VITE_API_BASE` into `window.API_BASE`.
- Uploads must call the configured API base, not `/api/upload` on GitHub Pages.
- The app clears old service worker caches on load to avoid stale bundles mixing with the latest deploy.

## Demo Account

The seed file creates a demo user for development and smoke testing:

- Email: `demo@qxwap.com`
- Password: `demo1234`
