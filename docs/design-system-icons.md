# QXwap Icon System

This file defines the production icon inventory for QXwap. Use it for Figma components, React usage, export naming, and future mobile ports.

## Current Runtime Ownership

- Runtime adapter: `apps/web/src/components/AppIcons.tsx`
- Inventory / manifest: `apps/web/src/design-system/icons.ts`
- Shared styling treatment: `apps/web/src/styles/icons.css`

`AppIcons.tsx` is the only runtime source that screens should import from. Screens and sheets should not choose raw glyph shapes directly.

## Source Files

```text
apps/web/src/design-system/icons.ts
docs/figma-free-import-kit/icon-registry.json
docs/figma-free-import-kit/icons/
```

## Rules

- Base size: `24px` viewBox.
- Touch target: minimum `44px`.
- Stroke: `2px`, round cap, round join.
- Runtime treatment: dual-layer soft 3D icon with shallow shadow layer and face layer.
- Figma component naming: `QXwap/Icon/Name=<IconName>`.
- SVG export naming: `icon-<kebab-name>.svg`.
- React mapping: semantic exports from `AppIcons.tsx`; registry keeps the source mapping.
- Icons inherit current text color unless a state explicitly changes color.
- Do not use icons alone for destructive actions without accessible labels.

## 3D Direction

- Geometry: rounded and compact, optimized for 18-24px usage.
- Depth: soft extrusion only; no glossy plastic or toy-like realism.
- Highlights: subtle warm highlight from top-left.
- Shadow: graphite-toned offset layer, low blur.
- Accent colors:
  - primary teal
  - coral accent
  - cream/glass surfaces
- States:
  - `default`: neutral graphite + soft shadow
  - `active`: stronger accent color and slightly brighter face layer
  - `inverse`: light face layer over dark surface
  - `disabled`: reduced opacity and lower depth contrast

## Categories

- `navigation`: app nav, back, close, menu.
- `marketplace`: Xwap, offer, product, save, share.
- `credit`: wallet, credit, cash, transactions.
- `profile`: user, avatar, follow, level, restricted state.
- `communication`: chat, messages, send, notifications.
- `logistics`: shipment, proof, pickup, delivery, location.
- `state`: success, error, warning, info, loading, empty.
- `utility`: sort, category, condition, price, tag, grid/list.

## Required Figma Components

The Figma Console all-in-one script creates `QXwap/Icon` variants from this inventory. If a new icon is added later:

1. Add it to `docs/figma-free-import-kit/icon-registry.json`.
2. Add it to `apps/web/src/design-system/icons.ts`.
3. Add/export `docs/figma-free-import-kit/icons/icon-*.svg`.
4. Add it to the icon list inside `docs/figma-console/s2-components.js`.
5. Rebuild `docs/figma-console/qxwap-all-in-one.js`.

## Current Inventory

See:

```text
docs/figma-free-import-kit/icon-registry.json
```

Important groups:

- Bottom nav: `Home`, `Shop`, `Add`, `Inbox`, `Profile`
- Topbar: `Search`, `Bell`, `Filter`, `Profile`
- Marketplace: `Xwap`, `Offer`, `Swap`, `Buy`, `Sell`, `Both`, `Wanted`, `Save`, `Share`
- Profile: `Avatar`, `Follow`, `Level`, `Registered`, `Restricted`, `Settings`, `Edit`
- Shipment: `Shipment`, `Proof`, `Pickup`, `Delivery`, `Location`
- States: `Success`, `Error`, `Warning`, `Info`, `Loading`, `Empty`, `Lock`

## Dev Usage

```ts
import { qxwapIconRegistry, qxwapIconUsage } from "./design-system/icons";
```

The app currently uses `lucide-react` directly in some components. Future cleanup can replace ad hoc imports with this registry so design and code stay aligned.
