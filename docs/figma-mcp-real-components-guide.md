# QXwap Figma MCP Real Components + Variants Guide

Use this for Step 3: create real Figma Components with Variants, Auto Layout, and native variable binding.

## Script

```text
docs/figma-mcp-real-components-script.js
```

## Target Figma File

```text
fileKey: 3BHvaNXqmDQJsqpfanxtHL
```

## How To Run

When Figma MCP quota is available:

```text
use_figma
fileKey: 3BHvaNXqmDQJsqpfanxtHL
skillNames: figma-use
code: contents of docs/figma-mcp-real-components-script.js
```

The script creates/clears this page:

```text
02 Components - Real Variants
```

## Components Created

### P0

| Component | Variants |
| --- | --- |
| `QXwap/Button` | `Type=Primary/Xwap/Secondary/Danger` x `State=default/pressed/disabled/loading` |
| `QXwap/Product Card` | `Layout=Feed/Shop` x `State=default/saved/owner/loading` |
| `QXwap/Bottom Nav Item` | `Tab=Feed/Shop/Add/Inbox/Profile` x `State=default/active/badge` |

### P1

| Component | Variants |
| --- | --- |
| `QXwap/Input` | `Type=text/search/password` x `State=default/focus/error/disabled` |
| `QXwap/Sheet` | `Type=Offer/Filter/Auth/Search` x `State=open/loading/error/success` |

### P2

| Component | Variants |
| --- | --- |
| `QXwap/Chip` | `Type=default/selected/level` |
| `QXwap/Icon` | `Name=<icon>` from `docs/figma-free-import-kit/icon-registry.json` |

The current icon registry prepares 73 icons for navigation, marketplace, credit, profile, communication, logistics, state, and utility use cases.

## Variable Binding

The script attempts to bind fills/strokes/text fills to existing COLOR Figma Variables if they exist.

It also binds key FLOAT variables to component geometry where useful:

- button height
- button horizontal padding
- item spacing
- card padding
- button/card/sheet/pill radius

It searches for token names such as:

```text
semantic.light.brand
semantic.light.surface
semantic.light.border
semantic.light.textPrimary
primitive.color.blue.500
primitive.color.gray.0
primitive.color.red.500
```

If Figma Variables do not exist yet, the components still render with fallback colors.

Recommended order:

1. Create Figma Variables first:
   - Preferred free route: run `docs/figma-console/s0-variables.js` in Figma Console.
   - Alternative: import `tokens.json` via Tokens Studio and push to Figma Variables.
2. Run `figma-mcp-styles-script.js` for text/effect styles.
3. Run `figma-mcp-real-components-script.js`.

## Current Limitation

If Figma MCP still returns the Starter plan limit, the script cannot be executed yet:

```text
You've reached the Figma MCP tool call limit on the Starter plan.
```

The script is ready-to-run and idempotent at page level: it clears and recreates `02 Components - Real Variants`.

## Follow-up After Running

After the script executes successfully:

1. Inspect each component set visually.
2. Rename or reorganize pages if needed.
3. Add descriptions to component properties if desired.
4. Replace raw HTML capture frames with instances from these component sets.
5. Use Figma Dev Mode to confirm variables/styles are visible in inspect.
