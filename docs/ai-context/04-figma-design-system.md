# 04 Figma Design System

Use this card for Figma, design system, variables, components, icons, prototype, or handoff work.

## Figma MCP Status

Figma MCP may be blocked by Starter plan quota. If blocked, do not keep retrying.

Use the free fallback:

```text
docs/figma-free-import-kit/README.md
docs/figma-free-import-kit/qxwap-free-figma-import-board.svg
```

Or use the Figma Console path:

```text
docs/figma-console/README.md
docs/figma-console/qxwap-all-in-one.js
```

## Token Sources

```text
apps/web/src/design-system/tokens.json
apps/web/src/design-system/qxwap-design-tokens.css
apps/web/src/design-system.ts
```

## Icon Sources

```text
apps/web/src/design-system/icons.ts
docs/design-system-icons.md
docs/figma-free-import-kit/icon-registry.json
docs/figma-free-import-kit/icons/
```

## Package Pages Needed In Figma

- Cover
- Design System
- Variables
- Text Styles
- Effect Styles
- Icon Library
- Components
- Sheets/Modals
- Mobile Screens
- Prototype Flows
- Journey Maps
- Dev Handoff

## Must Include

- Final UI Screens.
- Color Styles.
- Typography.
- Spacing, radius, shadow, motion tokens.
- Button/Input/Card/BottomNav/ProductCard components.
- Sheet components: Offer, Filter, Auth, Search.
- Icon section with names and 24px convention.
- Prototype flows.
- Journey maps by user level.
- Level and role matrix.
- QA scenarios, release gates, decision log, build plan, backlog, data model, dev handoff.

## Rules

- Do not modify app logic for Figma-only work.
- Do not use MCP while quota is limited.
- Prefer updating docs/import kit over spending tool calls.
- Keep names aligned with code tokens/components.
