// QXwap Figma Console Script — paste into Figma Plugins > Development > Open Console
// Source: figma-mcp-styles-script.js
// ─────────────────────────────────────────────────────────────────────
(async function qxwapScript() {

const createdStyleIds = [];
const updatedStyleIds = [];

const desiredTextStyles = [
  {
    name: "QXwap/Text/Display Brand",
    description: "QXwap logo and major brand lockups",
    size: 26,
    weight: "Black",
    lineHeightPercent: 105
  },
  {
    name: "QXwap/Text/Heading Screen",
    description: "Primary mobile screen title",
    size: 24,
    weight: "Black",
    lineHeightPercent: 110
  },
  {
    name: "QXwap/Text/Title Card",
    description: "Product card title and important item labels",
    size: 17,
    weight: "Black",
    lineHeightPercent: 120
  },
  {
    name: "QXwap/Text/Body Default",
    description: "Default body copy and normal content",
    size: 14,
    weight: "Regular",
    lineHeightPercent: 145
  },
  {
    name: "QXwap/Text/Label Strong",
    description: "Buttons, chips, tabs, and strong labels",
    size: 13,
    weight: "Bold",
    lineHeightPercent: 110
  },
  {
    name: "QXwap/Text/Caption Meta",
    description: "Metadata, helper copy, owner/location labels",
    size: 12,
    weight: "Medium",
    lineHeightPercent: 130
  }
];

const desiredEffectStyles = [
  {
    name: "QXwap/Shadow/Soft",
    description: "Subtle list/surface lift",
    effects: [{ y: 8, radius: 22, color: [16, 24, 40], alpha: 0.06 }]
  },
  {
    name: "QXwap/Shadow/Card",
    description: "Product card and feed card",
    effects: [{ y: 14, radius: 32, color: [35, 50, 90], alpha: 0.09 }]
  },
  {
    name: "QXwap/Shadow/Raised",
    description: "Elevated card or modal panel",
    effects: [{ y: 18, radius: 42, color: [32, 45, 85], alpha: 0.16 }]
  },
  {
    name: "QXwap/Shadow/Primary",
    description: "Primary and Xwap CTA",
    effects: [{ y: 12, radius: 28, color: [23, 107, 255], alpha: 0.28 }]
  },
  {
    name: "QXwap/Shadow/Sheet",
    description: "Bottom sheet elevation",
    effects: [{ y: -18, radius: 46, color: [16, 24, 40], alpha: 0.18 }]
  },
  {
    name: "QXwap/Shadow/Nav",
    description: "Sticky bottom navigation",
    effects: [{ y: -10, radius: 28, color: [16, 24, 40], alpha: 0.10 }]
  }
];

async function pickFont(weight) {
  const preferred = [
    { family: "Inter", style: weight },
    { family: "Inter", style: weight === "Black" ? "Bold" : weight },
    { family: "Inter", style: "Regular" }
  ];
  for (const fontName of preferred) {
    try {
      await figma.loadFontAsync(fontName);
      return fontName;
    } catch {}
  }
  const fonts = await figma.listAvailableFontsAsync();
  const inter = fonts.find((f) => f.fontName.family === "Inter")?.fontName;
  const fallback = inter || fonts[0].fontName;
  await figma.loadFontAsync(fallback);
  return fallback;
}

function rgbaEffect(input) {
  const [r, g, b] = input.color;
  return {
    type: "DROP_SHADOW",
    color: { r: r / 255, g: g / 255, b: b / 255, a: input.alpha },
    offset: { x: 0, y: input.y },
    radius: input.radius,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  };
}

async function upsertTextStyle(spec, existingStyles) {
  let style = existingStyles.find((s) => s.name === spec.name);
  const created = !style;
  if (!style) style = figma.createTextStyle();

  const fontName = await pickFont(spec.weight);
  style.name = spec.name;
  style.description = spec.description;
  style.fontName = fontName;
  style.fontSize = spec.size;
  style.lineHeight = { unit: "PERCENT", value: spec.lineHeightPercent };
  style.letterSpacing = { unit: "PERCENT", value: 0 };

  if (created) createdStyleIds.push(style.id);
  else updatedStyleIds.push(style.id);
  return style.id;
}

async function upsertEffectStyle(spec, existingStyles) {
  let style = existingStyles.find((s) => s.name === spec.name);
  const created = !style;
  if (!style) style = figma.createEffectStyle();

  style.name = spec.name;
  style.description = spec.description;
  style.effects = spec.effects.map(rgbaEffect);

  if (created) createdStyleIds.push(style.id);
  else updatedStyleIds.push(style.id);
  return style.id;
}

const existingTextStyles = await figma.getLocalTextStylesAsync();
const existingEffectStyles = await figma.getLocalEffectStylesAsync();

const textStyleIds = [];
for (const spec of desiredTextStyles) {
  textStyleIds.push(await upsertTextStyle(spec, existingTextStyles));
}

const effectStyleIds = [];
for (const spec of desiredEffectStyles) {
  effectStyleIds.push(await upsertEffectStyle(spec, existingEffectStyles));
}

return {
  createdStyleIds,
  updatedStyleIds,
  textStyleIds,
  effectStyleIds,
  textStyleCount: textStyleIds.length,
  effectStyleCount: effectStyleIds.length,
  textStyleNames: desiredTextStyles.map((s) => s.name),
  effectStyleNames: desiredEffectStyles.map((s) => s.name),
  note: "Created/updated QXwap Figma Text Styles and Effect Styles from design tokens."
};


})().then(function(result) {
  console.log('[QXwap] Done ✅', JSON.stringify(result, null, 2));
}).catch(function(err) {
  console.error('[QXwap] Error ❌', err);
});
