# QXwap Architecture Map

This document is the "where to edit what" map to reduce confusion and avoid editing dead/legacy paths.

## 1) Runtime services

### API server
- Entry: `artifacts/api-server/src/index.ts`
- Express app wiring: `artifacts/api-server/src/app.ts`
- Routes: `artifacts/api-server/src/routes/*`
- Startup DB bootstrap:
  - Optional baseline SQL file loader: `artifacts/api-server/src/lib/bootstrapSchema.ts`
  - Incremental startup migrations:
    - Runner: `artifacts/api-server/src/lib/startup-migrations/index.ts`
    - Domain step sets: `artifacts/api-server/src/lib/startup-migrations/steps-*.ts`

### Web app
- Active deploy artifact source: `artifacts/web-app/index.html`
- Build config: `artifacts/web-app/vite.config.ts`
- API helpers used by modular code:
  - Transport/core: `artifacts/web-app/src/api/core.js`
  - Domain clients:
    - Aggregator: `artifacts/web-app/src/api.js`
    - Per-domain modules: `artifacts/web-app/src/api/domains/*.js`

## 2) Data contracts and schema
- DB schema source package: `lib/db/src/schema/*`
- API spec and generated clients:
  - `lib/api-spec/openapi.yaml`
  - `lib/api-zod/src/generated/*`
  - `lib/api-client-react/src/generated/*`

## 3) Known mixed-path area
- `artifacts/web-app/src/ui/*` contains partially modularized UI logic from earlier iterations.
- `artifacts/web-app/index.html` is still used as primary runtime in current build.
- Rule: before implementing features, decide one path and keep changes in that path only.

## 4) Recommended refactor sequence (next phase)
1. Choose single frontend path (single-file or modular).
2. Remove unused path after parity verification.
3. Keep API integration centralized through one helper module.
4. Add smoke tests per critical user journey (auth, listing, upload, feed, offer).
