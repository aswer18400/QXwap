# QXwap Figma MCP Components Guide

Use this for option B: create real Figma components programmatically through Figma MCP.

## Current Status

The reproducible component generator script is ready:

```text
docs/figma-mcp-components-script.js
```

It creates real Figma `COMPONENT` nodes for:

- Button / Primary
- Button / Xwap
- Button / Secondary
- Button / Danger
- Button / Disabled
- Input / Default
- Input / Focus
- Input / Error
- Input / Disabled
- Card / Product / Shop
- Card / Feed / Recommendation
- Chip / Default
- Chip / Selected
- Chip / Deal
- IconButton / Default
- IconButton / Active
- IconButton / Disabled
- BottomNav / Item / Default
- BottomNav / Item / Active
- Sheet / BottomSheet
- EmptyState / Default

## How To Run

When Figma MCP quota is available again:

1. Open the target Figma file:

```text
https://www.figma.com/design/3BHvaNXqmDQJsqpfanxtHL
```

2. Call Figma MCP `use_figma` with:

```text
fileKey: 3BHvaNXqmDQJsqpfanxtHL
skillNames: figma-use
code: contents of docs/figma-mcp-components-script.js
```

3. The script creates/clears this page:

```text
02 Components - MCP Generated
```

4. Validate created components in Figma.

## Important Limitation

The script was not executed yet because Figma MCP returned:

```text
You've reached the Figma MCP tool call limit on the Starter plan.
```

So this is ready-to-run, but not yet pushed into the Figma file.

## Next MCP Passes

After this base script runs successfully, recommended follow-up scripts:

1. Create component sets / variants:
   - `Button`
   - `Input`
   - `IconButton`
   - `BottomNavItem`
   - `Chip`

2. Bind variables from `tokens.json`:
   - colors
   - spacing
   - radius
   - shadows/effects

3. Add component descriptions:
   - purpose
   - states
   - props/data
   - accessibility notes

4. Replace raw HTML capture frames with component instances where practical.

## Source Files

Component script:

```text
docs/figma-mcp-components-script.js
```

Token source:

```text
apps/web/src/design-system/tokens.json
```

Component/state docs:

```text
docs/design-system-states.md
docs/ai-context/README.md
docs/project-index-glossary-risk.md
```
