# QXwap Free Figma Import Kit

This kit is the free fallback when Figma MCP is blocked by the Starter plan tool-call limit.

## Best Free Option

Use the SVG board:

```text
docs/figma-free-import-kit/qxwap-free-figma-import-board.svg
```

How to use:

1. Open Figma.
2. Create or open the QXwap design file.
3. Drag `qxwap-free-figma-import-board.svg` into the canvas.
4. Ungroup imported layers if needed.
5. Move the imported board into a page named:

```text
00 Free Import - QXwap Board
```

## What This Gives You

- 8 mobile screen placeholders.
- Design token summary: colors, spacing, radius, shadow, motion.
- Component list.
- Icon registry and SVG export assets.
- Prototype flow map.
- Developer handoff notes.
- No Figma MCP quota usage.
- No paid tool required.

Icon files:

```text
docs/figma-free-import-kit/icon-registry.json
docs/figma-free-import-kit/icons/icon-*.svg
```

## Limitations

- It does not create real Figma Variables.
- It does not create real Figma Components/Variants.
- It does not wire prototype interactions automatically.
- It is an editable visual board, not a native design-system library.

## Recommended Workflow

Use this board now for free handoff and review. Later, when Figma MCP quota is available, run these native scripts in order:

1. `docs/figma-mcp-styles-script.js`
2. `docs/figma-mcp-real-components-script.js`
3. `docs/figma-mcp-component-screens-script.js`
4. `docs/figma-mcp-prototype-wiring-script.js`

## HTML Prototype Links

For clickable review without Figma MCP:

```text
http://localhost:8099/qxwap-figma-final-package.html
http://localhost:8099/qxwap-interactive-prototype.html
```

Run local docs server:

```bash
cd <repo-root>/docs
python3 -m http.server 8099
```

## Manual Prototype Wiring In Figma

If you need a clickable Figma prototype without MCP, manually connect these frames:

1. Guest -> Login -> Xwap
2. Feed -> Detail -> Offer Sheet
3. Shop -> Search/Filter -> Detail
4. Add Product -> Review -> Published
5. Inbox -> Accept -> Shipment
6. Restricted -> Modal -> View only

Use the imported `Prototype Flows` section as the wiring checklist.
