# QXwap Design System

QXwap Design System is the production UI foundation for the mobile-first marketplace app. It is not only a CSS kit: it defines token hierarchy, component states, accessibility rules, layout rules, dark-mode contracts, and portable token files for other platforms.

## Files

- `tokens.json` - platform-neutral source tokens for Figma/Tokens Studio, Tailwind, React, iOS, and Android.
- `qxwap-design-tokens.css` - CSS custom properties generated from the token hierarchy.
- `qxwap-components.css` - prefixed reference components and state classes.
- `qxwap-tailwind-preset.js` - Tailwind preset that maps utilities to QXwap CSS variables.
- `components-example.html` - static usage examples for cards, bottom nav, forms, login, and shop grid.

The app imports `qxwap-design-tokens.css` through `apps/web/src/styles/index.css`. The reference component CSS is intentionally prefixed with `qx-` so it can be used for prototypes without overriding current app classes.

## Token Hierarchy

Primitive tokens are raw decisions:

- `--qx-blue-50`, `--qx-blue-500`, `--qx-gray-900`
- `--qx-space-4`, `--qx-radius-lg`, `--qx-shadow-md`
- `--qx-text-sm`, `--qx-leading-normal`, `--qx-weight-black`

Semantic tokens describe product meaning:

- `--qx-color-brand`
- `--qx-color-page`
- `--qx-color-surface`
- `--qx-color-text-primary`
- `--qx-color-danger`
- `--qx-color-focus`

Component tokens describe reusable UI contracts:

- `--qx-button-height`
- `--qx-button-bg`
- `--qx-card-radius`
- `--qx-nav-height`
- `--qx-sheet-max-height`
- `--qx-layout-mobile-width`

## Typography Scale

| Role | Token | Use |
| --- | --- | --- |
| Heading 1 | `--qx-type-heading-1-*` | Screen titles and major page headings |
| Heading 2 | `--qx-type-heading-2-*` | Card and sheet titles |
| Body | `--qx-type-body-*` | Product descriptions and normal text |
| Label | `--qx-type-label-*` | Buttons, inputs, filters, tabs |
| Caption | `--qx-type-caption-*` | Metadata, helper text, small nav labels |

Do not scale type with viewport width. Keep letter spacing at normal unless a component spec explicitly says otherwise.

## Layout System

- Mobile container: `--qx-layout-mobile-width` is `520px`.
- Page padding: `--qx-layout-page-padding` is `14px`.
- Bottom nav: `--qx-nav-height` is `76px` plus `safe-area-inset-bottom`.
- Minimum touch target: `--qx-touch-target-min` is `44px`.
- Sheets: `--qx-sheet-max-height` keeps dialogs inside mobile viewports.
- Page shells must reserve bottom padding for fixed navigation.

## Component State Spec

All production components must define these states:

| State | Required behavior |
| --- | --- |
| default | Stable size, readable contrast, no layout shift |
| hover | Slight surface/brand change on pointer devices |
| active | Pressed feedback without moving surrounding layout |
| focus | Visible `:focus-visible` ring using `--qx-focus-ring` |
| disabled | Lower opacity, no pointer action, no primary shadow |
| loading | Spinner or progress marker, button remains same size |
| error | Border or text uses `--qx-color-danger`; explain with text or aria |

Reference classes:

- Button: `.qx-button`, `.qx-button--primary`, `.qx-button--xwap`, `.qx-button--danger`
- Card: `.qx-card`
- Form field: `.qx-field`
- Chip/filter: `.qx-chip`
- Bottom nav: `.qx-bottom-nav`
- Sheet/dialog: `.qx-sheet-backdrop`, `.qx-sheet`

## Accessibility Rules

- Focus ring: every interactive element must have a visible `:focus-visible` style.
- Touch target: interactive controls must be at least `44px` tall/wide.
- Contrast: text on surface should target WCAG AA. Primary buttons use white text on QXwap blue.
- Dialog/sheet pattern:
  - wrapper uses `role="dialog"` and `aria-modal="true"` when implemented in React.
  - heading is connected with `aria-labelledby`.
  - close button has a clear accessible name.
  - focus should move into the dialog and return to the trigger.
- Bottom nav pattern:
  - use `<nav aria-label="Primary">`.
  - active item uses `aria-current="page"` or `data-state="active"`.
- Filter chips:
  - toggles use `aria-pressed`.
  - selected state must be visible beyond color where possible.
- Form errors:
  - invalid inputs use `aria-invalid="true"`.
  - error text is connected with `aria-describedby`.

## Dark Mode

Dark mode is defined through `[data-theme="dark"]` and `prefers-color-scheme: dark`. Components should use semantic tokens only, not raw primitive colors, when they render text, surfaces, borders, or states.

Manual validation checklist:

- Product cards keep readable title/metadata.
- Primary and Xwap buttons keep strong contrast.
- Bottom nav active state remains clear.
- Sheets do not blend into scrim.
- Error and disabled states remain distinct.

## Usage Examples

React button:

```tsx
<button className="qx-button qx-button--xwap" type="button">
  Xwap
</button>
```

React card:

```tsx
<article className="qx-card qx-section">
  <h2 className="qx-type-heading-2">iPad mini 6 สีม่วง</h2>
  <p className="qx-type-caption">อยากแลกกับ กล้องฟิล์ม · สภาพ 92%</p>
  <button className="qx-button qx-button--primary">Xwap</button>
</article>
```

Bottom nav:

```tsx
<nav className="qx-bottom-nav" aria-label="Primary">
  <button aria-current="page">Feed</button>
  <button>Shop</button>
  <button>Add</button>
  <button>Inbox</button>
  <button>Profile</button>
</nav>
```

Sheet/dialog:

```tsx
<div className="qx-sheet-backdrop">
  <section className="qx-sheet" role="dialog" aria-modal="true" aria-labelledby="offer-title">
    <h2 id="offer-title" className="qx-type-heading-2">Xwap</h2>
    <button className="qx-button qx-button--primary">ส่ง Xwap</button>
  </section>
</div>
```

Tailwind:

```js
import qxwapPreset from "./src/design-system/qxwap-tailwind-preset.js";

export default {
  presets: [qxwapPreset],
  content: ["./src/**/*.{ts,tsx}"]
};
```

## Production Rules

- New UI should use semantic or component tokens instead of raw color values.
- New components must document states before merging.
- Do not introduce a new radius, shadow, or blue unless it becomes a token.
- Do not add cards inside cards unless the component spec explicitly calls for nesting.
- Test at mobile `390px` and the app max width `520px`.
