# QXwap Figma MCP Component Screens Guide

Use this for Step 4: archive raw HTML capture frames and rebuild 8 screens using real Figma component instances.

## Script

```text
docs/figma-mcp-component-screens-script.js
```

## Target Figma File

```text
fileKey: 3BHvaNXqmDQJsqpfanxtHL
```

## Prerequisites

Run these steps first:

1. Step 1: import `apps/web/src/design-system/tokens.json` via Tokens Studio and push to Figma Variables.
2. Step 2: run `docs/figma-mcp-styles-script.js`.
3. Step 3: run `docs/figma-mcp-real-components-script.js`.

Step 4 depends on component sets created by Step 3.

## How To Run

When Figma MCP quota is available:

```text
use_figma
fileKey: 3BHvaNXqmDQJsqpfanxtHL
skillNames: figma-use
code: contents of docs/figma-mcp-component-screens-script.js
```

## What It Does

Creates/clears this page:

```text
04 Screens - Component Instances
```

Archives likely raw HTML capture frames into:

```text
99 Archive - HTML Captures
```

Then rebuilds 8 screens:

```text
Screen / Feed
Screen / Shop
Screen / Detail
Screen / Profile
Screen / Add Product
Screen / Offer Sheet
Screen / Inbox
Screen / Wallet / Shipment
```

## Component Sources Used

The script looks for component sets:

```text
QXwap/Button
QXwap/Product Card
QXwap/Bottom Nav Item
QXwap/Input
QXwap/Sheet
QXwap/Chip
QXwap/Icon
```

If a component variant is missing, the script inserts a visible fallback card and returns warnings.

## Dev Inspect Goal

After this script runs, Figma Inspect should show:

- component names from Step 3
- variants such as `Type=Xwap`, `State=default`
- token-bound variables if Step 1 succeeded
- Text Styles and Effect Styles if Step 2 succeeded

## Current Limitation

If Figma MCP still returns the Starter plan limit, the script cannot be executed yet:

```text
You've reached the Figma MCP tool call limit on the Starter plan.
```

The script is ready-to-run and idempotent at page level: it clears and recreates `04 Screens - Component Instances`.

## Important Safety Note

The script archives likely HTML capture frames conservatively. It protects these pages:

```text
02 Components - Real Variants
02 Components - MCP Generated
04 Screens - Component Instances
99 Archive - HTML Captures
```

Review `99 Archive - HTML Captures` after running before deleting anything permanently.

