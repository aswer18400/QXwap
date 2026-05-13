# QXwap Figma MCP Prototype Wiring Guide

This is Step 5 of the QXwap Figma rebuild path. It wires the real component-instance screens into a clickable Figma prototype.

## Prerequisites

Run these steps first:

1. Import `apps/web/src/design-system/tokens.json` into Figma Variables with Tokens Studio.
2. Run `docs/figma-mcp-styles-script.js` to create Text Styles and Effect Styles.
3. Run `docs/figma-mcp-real-components-script.js` to create real components and variants.
4. Run `docs/figma-mcp-component-screens-script.js` to rebuild the 8 screens from component instances.

The prototype wiring script expects this page to exist:

```text
04 Screens - Component Instances
```

## Target Figma File

```text
fileKey: 3BHvaNXqmDQJsqpfanxtHL
name: QXwap Feed Redesign Concepts
```

## Script

```text
docs/figma-mcp-prototype-wiring-script.js
```

Run it with Figma MCP `use_figma` using:

```text
skillNames: figma-use
fileKey: 3BHvaNXqmDQJsqpfanxtHL
code: contents of docs/figma-mcp-prototype-wiring-script.js
```

Important: direct Figma writes may be blocked if the Figma MCP Starter plan tool-call limit has been reached. A direct run attempt on 2026-05-13 was blocked by that quota limit. If blocked, keep this script as the reproducible source and rerun after quota is available.

## Flows Wired

1. Guest -> Login -> Xwap
2. Feed -> Detail -> Offer Sheet
3. Shop -> Search/Filter -> Detail
4. Add Product -> Review -> Publish Success -> Feed
5. Inbox -> Accept Offer -> Shipment
6. Restricted User -> Restricted Modal

## What The Script Creates

- Prototype hotspots on the 8 component-instance screens.
- Overlay frames for:
  - `Prototype / Guest Login Modal`
  - `Prototype / Restricted User Modal`
  - `Prototype / Search Filter Overlay`
  - `Prototype / Accept Offer Modal`
- Extra flow frames for:
  - `Prototype / Add Product Review`
  - `Prototype / Add Product Success`
  - `Prototype / Flow Index`
- Flow labels above the related screens.

The script clears only nodes whose names start with:

```text
Prototype /
Flow Label /
Prototype Hotspot /
```

It also clears existing reactions on the target page before rewiring, so run it only on the generated component-instance prototype page.

## Manual Follow-Up

The Figma Plugin API exposes `prototypeStartNode` as readonly in the current runtime. After running the script, manually set `Screen / Feed` as the prototype starting point if Figma does not do it automatically.

## QA Checklist

- Prototype starts from `Screen / Feed`.
- Guest Xwap opens the login modal, then continues to Offer Sheet.
- Feed card opens Detail.
- Detail Xwap opens Offer Sheet.
- Shop search/filter opens overlay, then goes to Detail.
- Add Product continues to Review, Publish Success, then Feed.
- Inbox accept opens modal, then goes to Wallet / Shipment.
- Restricted action opens Restricted User modal.
- Dev Inspect shows component names from Step 3, not only HTML capture layers.
- No archived HTML capture frames are used as live prototype screens.
