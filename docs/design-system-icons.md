# QXwap Icon System

This file defines the production icon inventory for QXwap. Use it for Figma components, React usage, export naming, and future mobile ports.

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
- Figma component naming: `QXwap/Icon/Name=<IconName>`.
- SVG export naming: `icon-<kebab-name>.svg`.
- React mapping: use `lucide-react` names from the registry.
- Icons inherit current text color unless a state explicitly changes color.
- Do not use icons alone for destructive actions without accessible labels.

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
