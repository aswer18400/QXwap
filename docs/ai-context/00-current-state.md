# 00 Current State

Use this card for a quick project status without reading the long handoff.

## Source

GitHub main is source of truth; local worktrees are temporary:

```text
<repo-root>
```

GitHub main is source of truth:

```text
https://github.com/aswer18400/QXwap
```

## App Shape

- `apps/web`: React + Vite frontend.
- `apps/api`: Express API with Postgres/PGlite-compatible persistence.
- `docs`: design, Figma, QA, handoff, deployment notes.

## Verified Recently

- Feed renders real API data.
- Guest bottom login nudge is fixed enough for current QA.
- Feed product card opens detail.
- Wanted tags go to Shop/filter.
- Xwap opens offer flow.
- User without products can offer with message/cash/credit.
- Inbox handles flat and nested offer data.
- Accepted offer exposes Instant Swap shipment flow.
- Web/API builds pass.
- Upload endpoint falls back to local disk in dev and uses Supabase Storage when storage env vars are configured.

## Evidence To Open Only If Needed

```text
docs/manual-qa.md
docs/production-deployment-plan.md
docs/claude-code-handoff.md
```

## Known Risks

- Production upload storage needs real Supabase bucket/env configuration before staging.
- Profile photo persistence needs full refresh/re-login QA.
- Owner/non-owner permissions need two-session QA.
- Figma native Variables/Components may still need manual import if MCP quota is limited.

## Do Next

If the user asks for code work, pick one narrow card:

- Frontend: `docs/ai-context/02-frontend-next.md`
- Backend: `docs/ai-context/03-backend-next.md`
- Figma: `docs/ai-context/04-figma-design-system.md`
- Deploy: `docs/ai-context/05-deploy-next.md`
