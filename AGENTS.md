# QXwap Agent Instructions

Repository: `aswer18400/QXwap`
Default branch: `main`

## Agent operating mode

1. Start read-only: inspect repository structure, package files, deployment files, schema files, and key app entry points before editing.
2. Use `docs/agent-index/README.md` and any generated files in `docs/agent-index/` as the first context source.
3. Never commit secrets, private keys, service-role keys, `.env`, tokens, or credentials.
4. Prefer a new branch for every change. Do not push directly to `main` unless explicitly requested.
5. Before making code changes, identify the exact files affected and explain why they are the right files.
6. After changes, run available checks: `pnpm install`, `pnpm run typecheck`, `pnpm run build`, or the closest project-specific command.
7. Open a pull request with a clear summary, testing notes, and risk notes.

## Project signals

Known areas from repository search:

- Web app artifacts: `artifacts/web-app/`
- API server artifacts: `artifacts/api-server/`
- Expo app: `apps/expo-go/`
- Supabase schema assets: `attached_assets/supabase_schema_*.sql`
- Render deployment config: `render.yaml`
- Existing build/index script: `scripts/build-index.mjs`

## Useful commands

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm agent:index
```

If `pnpm agent:index` is not available yet, use repository search and manually create a text analysis in `docs/agent-index/`.
