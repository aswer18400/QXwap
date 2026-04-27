## PR #69 readiness update

### Testing executed
The following checks are expected to pass on this branch before merge:

- `git diff --check`
- conflict-marker scan (`rg -n "^(<<<<<<<|=======|>>>>>>>)"`)
- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server build`
- `pnpm --filter @workspace/api-server test`
- `PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build`
- `pnpm --filter @workspace/scripts run verify:runtime-config`

### Runtime API base normalization
`API_BASE_URL` may be configured either as host-only (for example, `https://qxwap-api.onrender.com`) or already suffixed with `/api`.

At deploy/runtime, values are normalized so the effective API base always ends with `/api`:

- `https://qxwap-api.onrender.com` -> `https://qxwap-api.onrender.com/api`
- `https://qxwap-api.onrender.com/api` -> unchanged
- `/` or empty -> `/api`

The deployment workflow injects this normalized value into `window.__API_BASE__`, and API health checks use `${NORMALIZED_API_BASE}/health` to validate the same base format used by the web client.
