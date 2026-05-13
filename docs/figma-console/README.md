# QXwap Figma Console Scripts

Use this when Figma MCP is blocked by the Starter plan tool-call limit but you can open the Figma file locally.

## Best No-Cost Native Figma Path

Run the all-in-one script:

```text
docs/figma-console/qxwap-all-in-one.js
```

It now runs 5 steps:

1. `s0-variables.js` — creates Figma Variables in `QXwap Tokens`.
2. `s1-styles.js` — creates Text Styles and Effect Styles.
3. `s2-components.js` — creates real Components/Variants and binds color + key FLOAT variables when available.
4. `s3-screens.js` — creates 8 screens from component instances.
5. `s4-prototype.js` — wires the 6 prototype flows.

## Run Command

Copy the all-in-one script to clipboard:

```bash
pbcopy < /Users/raynee/Documents/Codex/2026-05-08/lm-api-i-want-you-to/docs/figma-console/qxwap-all-in-one.js && echo "Copied!"
```

Then in Figma:

1. Open the QXwap Figma file.
2. Open `Plugins -> Development -> Open Console`.
3. Paste with `Cmd + V`.
4. Press Enter.
5. Wait for:

```text
[QXwap] ALL DONE QXwap complete — Variables, Styles, Components, Screens, Prototype all wired.
```

## Why This Exists

The SVG fallback is free but not a real Figma design system. It does not create native Variables or Components.

The Console path is also free and can create native Figma objects because it runs inside your Figma file, without spending Figma MCP tool calls.

## Expected Result

- Variable collection: `QXwap Tokens`
- Text styles: `QXwap/Text/*`
- Effect styles: `QXwap/Shadow/*`
- Component sets:
  - `QXwap/Button`
  - `QXwap/Product Card`
  - `QXwap/Bottom Nav Item`
  - `QXwap/Input`
  - `QXwap/Sheet`
  - `QXwap/Chip`
  - `QXwap/Icon`
- Icon assets and registry:
  - `docs/figma-free-import-kit/icon-registry.json`
  - `docs/figma-free-import-kit/icons/icon-*.svg`
  - `apps/web/src/design-system/icons.ts`
- Screen page: `04 Screens - Component Instances`
- Prototype hotspots and overlays for 6 flows

## Known Limits

- Color variables are created and component fills/strokes/text fills bind to matching variables.
- Key numeric tokens are created as FLOAT variables and bound to important component properties: button height, padding, item spacing, card padding, core radii, sheet radius, and pill radius.
- Some decorative dimensions remain fixed where Figma variable binding is not useful for the prototype, such as sample image widths and icon drawing geometry.
- Shadows are created as Effect Styles, not full shadow Variables.
- Starter plan may limit multiple variable modes, so this script creates a safe single `Light` mode.

## If Components Still Show No Variables

Make sure `Step 0 — Variables` appears before `Step 2 — Real Components + Variants` in the console log.

Then check the all-in-one result:

```text
components.variableBindingAvailable
```

The important values should be `true` for:

```text
brand
brandSoft
surface
border
text
muted
inverse
danger
success
warning
```

Also check:

```text
components.floatVariableBindingAvailable
```

Important values should be `true` for:

```text
buttonHeight
buttonPaddingX
buttonRadius
cardRadius
cardPadding
sheetRadius
radiusPill
space2
space3
space4
```

## Icon Coverage

The script creates `QXwap/Icon` variants from the icon registry. The current registry includes 73 icons across:

- navigation
- marketplace
- credit
- profile
- communication
- logistics
- state
- utility

See:

```text
docs/design-system-icons.md
docs/figma-free-import-kit/icon-registry.json
apps/web/src/design-system/icons.ts
```
