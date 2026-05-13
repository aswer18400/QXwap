# Copy-Paste Prompts For Another AI

Use one prompt only. Attach or mention `AI_START_HERE.md` first.

## Frontend Bug

```text
Read AI_START_HERE.md, then docs/ai-context/02-frontend-next.md.
Fix only the frontend bug I describe next.
Use minimal patch, do not change backend/database, do not rewrite the app.
After editing, run:
pnpm run typecheck
PORT=4173 BASE_PATH=/ pnpm --filter @workspace/web-app build
rg -n "^<<<<<<<|^=======|^>>>>>>>" apps/web docs || true
git diff --check
Report files changed, commands run, errors, and remaining risk.
```

## Backend/API Bug

```text
Read AI_START_HERE.md, then docs/ai-context/03-backend-next.md.
Fix only the API/database bug I describe next.
Preserve /api routes, session behavior, upload compatibility, and PGlite local dev.
After editing, run:
pnpm --filter @workspace/api-server test
pnpm --filter @workspace/api-server build
rg -n "^<<<<<<<|^=======|^>>>>>>>" apps/api docs || true
git diff --check
Report files changed, commands run, errors, and remaining risk.
```

## Figma/Design Handoff

```text
Read AI_START_HERE.md, then docs/ai-context/04-figma-design-system.md.
Figma MCP may be quota-limited, so use the free import kit or Figma Console route.
Do not change app logic.
Update only docs/design-system/Figma handoff assets.
Report exactly what Figma-ready artifacts were created or updated.
```

## Deploy Planning

```text
Read AI_START_HERE.md, then docs/ai-context/05-deploy-next.md.
Do not deploy yet.
Prepare a staging deployment checklist and list required env values.
Do not guess secrets.
```

## Status Summary

```text
Read AI_START_HERE.md and docs/ai-context/00-current-state.md only.
Summarize the current project status, what is verified, what remains, and the next safest task.
Do not inspect the whole repo unless a specific claim needs verification.
```
