# QXwap Figma MCP Text + Effect Styles Guide

Use this for Step 2: create real Figma Text Styles and Effect Styles through Figma MCP.

## Script

```text
docs/figma-mcp-styles-script.js
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
code: contents of docs/figma-mcp-styles-script.js
```

## Text Styles Created

The script creates/updates these 6 text styles:

```text
QXwap/Text/Display Brand
QXwap/Text/Heading Screen
QXwap/Text/Title Card
QXwap/Text/Body Default
QXwap/Text/Label Strong
QXwap/Text/Caption Meta
```

Mapped from the design system:

| Style | Size | Weight | Line height |
| --- | ---: | --- | ---: |
| Display Brand | 26 | Black | 105% |
| Heading Screen | 24 | Black | 110% |
| Title Card | 17 | Black | 120% |
| Body Default | 14 | Regular | 145% |
| Label Strong | 13 | Bold | 110% |
| Caption Meta | 12 | Medium | 130% |

## Effect Styles Created

The script creates/updates these Effect Styles:

```text
QXwap/Shadow/Soft
QXwap/Shadow/Card
QXwap/Shadow/Raised
QXwap/Shadow/Primary
QXwap/Shadow/Sheet
QXwap/Shadow/Nav
```

Mapped from QXwap shadow tokens:

| Style | Value |
| --- | --- |
| Soft | `0 8px 22px rgba(16,24,40,.06)` |
| Card | `0 14px 32px rgba(35,50,90,.09)` |
| Raised | `0 18px 42px rgba(32,45,85,.16)` |
| Primary | `0 12px 28px rgba(23,107,255,.28)` |
| Sheet | `0 -18px 46px rgba(16,24,40,.18)` |
| Nav | `0 -10px 28px rgba(16,24,40,.10)` |

## Current Limitation

If Figma MCP still returns the Starter plan limit, the script cannot be executed yet:

```text
You've reached the Figma MCP tool call limit on the Starter plan.
```

When quota is available, rerun this script. It is idempotent: existing styles with the same names are updated, missing styles are created.

