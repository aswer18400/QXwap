# QXwap Figma Variables Import

Use this when Figma MCP tool calls are unavailable or rate-limited.

## Goal

Create Figma Variables from:

```text
apps/web/src/design-system/tokens.json
```

Token groups to create:

- Colors
- Spacing
- Radius
- Shadow
- Motion

## Recommended Method: Tokens Studio

1. Open the Figma file:

```text
https://www.figma.com/design/3BHvaNXqmDQJsqpfanxtHL
```

2. Open the Tokens Studio plugin.

3. Import this file:

```text
<repo-root>/apps/web/src/design-system/tokens.json
```

4. Confirm token sets:

```text
primitive
semantic
component
```

5. Push/import to Figma Variables.

6. Verify in Figma Dev Mode / Inspect that token names appear, for example:

```text
primitive.color.blue.500
semantic.light.brand
semantic.light.surface
primitive.space.4
primitive.radius.md
primitive.shadow.md
primitive.motion.base
component.button.height
component.card.radius
```

## Expected Variable Collections

Suggested Figma collections:

```text
QXwap / Primitive
QXwap / Semantic
QXwap / Component
```

Suggested modes:

```text
Primitive: default
Semantic: light, dark
Component: default
```

## Notes

- Figma native variables support colors and numeric values well.
- Shadow tokens may import as box shadow tokens in Tokens Studio; if native Figma variables cannot represent them, push them as Effect Styles or keep them as string tokens.
- Motion easing such as `cubic-bezier(.2,.8,.2,1)` may remain a string token in Tokens Studio.
- Do not rename tokens manually after import, because dev inspect depends on stable token names.

## Source of Truth

The source of truth is:

```text
apps/web/src/design-system/tokens.json
```

Do not recreate tokens manually in Figma unless this file is also updated.

