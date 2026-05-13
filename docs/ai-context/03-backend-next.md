# 03 Backend Next

Use this card for API, database, auth/session, upload, wallet, notifications, chat, deals, shipments.

## Read Only What You Need

API routes:

```text
apps/api/src/server.ts
```

Database/migration/seed:

```text
apps/api/src/db.ts
```

Session persistence:

```text
apps/api/src/session-store.ts
```

Tests:

```text
apps/api/tests/api.test.ts
```

Contract docs:

```text
docs/item-contract.md
docs/migration-nested-item.md
```

## Current Backend Shape

- Express API under `/api`.
- PostgreSQL-compatible schema.
- Local dev can use PGlite with `PGLITE_DATA_DIR`.
- Sessions are stored in `user_sessions`.
- Upload endpoint returns URLs used by web `asset()` helper.

## High-Risk Areas

- Production image storage supports Supabase Storage when env vars are configured.
- Staging still needs a real bucket and public URL policy.
- Session cookies must work for local and production origins.
- Invalid signin must return 401, not 500.
- Migration startup should fail fast if critical schema is missing.
- Existing image URLs must stay compatible.

## Rules

- Do not guess real secrets.
- If adding env vars, update `.env.example` and README.
- Preserve `/api` prefix.
- Preserve local PGlite dev path.
- Add/adjust tests for route behavior changes.

## Verification

```bash
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
curl -s http://localhost:8787/api/health
rg -n "^<<<<<<<|^=======|^>>>>>>>" apps/api docs || true
git diff --check
```

## Manual QA After Backend Changes

- Signup/signin/signout/me.
- Product list loads after login.
- Upload image and render in Feed/Shop/Detail.
- Send Xwap as user with no products.
- Accept/reject/cancel/confirm offer.
- Start shipment after accepted offer.
