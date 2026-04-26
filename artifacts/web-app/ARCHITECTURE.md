# Web App Structure (Current Source of Truth)

## Runtime app
- **Primary runtime UI:** `artifacts/web-app/index.html`
  - This file contains the active UI markup + runtime script that is built/deployed by Vite.
- **Build config:** `artifacts/web-app/vite.config.ts`

## API integration
- Frontend API calls are centralized in:
  - `artifacts/web-app/src/api/core.js` (base URL, request/upload transport, query string helper)
  - `artifacts/web-app/src/api.js` (domain aggregator)
  - `artifacts/web-app/src/api/domains/*.js` (feature/domain API groups)
- If you are working on auth/listing/feed behavior, verify the page path actually uses that module path before editing.

## Important note about legacy/experimental files
- The `artifacts/web-app/src/ui/*` files are partially modularized logic from earlier iterations.
- Some deployments still use the single-file runtime in `index.html`.
- Before changing features, confirm which path is active in your deployed artifact.

## Cleanup direction
1. Keep feature changes in one path only (single-file or modular), not both.
2. Avoid introducing mock fallback data in production flows.
3. Prefer explicit API base configuration (`VITE_API_BASE`) in deploy environments.
