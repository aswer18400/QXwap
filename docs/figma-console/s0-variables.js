// QXwap Figma Console Script — paste into Figma Plugins > Development > Open Console
// Step 0: Create Figma Variables from QXwap token names before creating components.
// ─────────────────────────────────────────────────────────────────────
(async function qxwapVariables() {
  const createdVariableIds = [];
  const updatedVariableIds = [];
  const warnings = [];

  function hexToColor(hex) {
    const clean = String(hex).replace("#", "");
    const n = parseInt(clean, 16);
    return {
      r: ((n >> 16) & 255) / 255,
      g: ((n >> 8) & 255) / 255,
      b: (n & 255) / 255,
      a: 1
    };
  }

  function px(value) {
    if (typeof value === "number") return value;
    const match = String(value).match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  const colorTokens = {
    "primitive/color/blue/50": "#eef6ff",
    "primitive/color/blue/100": "#dbeafe",
    "primitive/color/blue/200": "#b9ddff",
    "primitive/color/blue/300": "#8ac8ff",
    "primitive/color/blue/400": "#53a7ff",
    "primitive/color/blue/500": "#176bff",
    "primitive/color/blue/600": "#0d55db",
    "primitive/color/blue/700": "#1247ad",
    "primitive/color/purple/300": "#c4b5fd",
    "primitive/color/purple/500": "#6d5dfc",
    "primitive/color/gray/0": "#ffffff",
    "primitive/color/gray/50": "#fbfcff",
    "primitive/color/gray/100": "#f3f6ff",
    "primitive/color/gray/200": "#e8ebf3",
    "primitive/color/gray/600": "#68748a",
    "primitive/color/gray/800": "#252b3a",
    "primitive/color/gray/900": "#101322",
    "primitive/color/gray/950": "#070b18",
    "primitive/color/green/500": "#17a765",
    "primitive/color/red/500": "#ef4444",
    "primitive/color/amber/500": "#f59e0b",
    "semantic/light/brand": "#176bff",
    "semantic/light/brandHover": "#0d55db",
    "semantic/light/brandAccent": "#6d5dfc",
    "semantic/light/page": "#fbfcff",
    "semantic/light/surface": "#ffffff",
    "semantic/light/surfaceSubtle": "#f3f6ff",
    "semantic/light/border": "#e8ebf3",
    "semantic/light/textPrimary": "#101322",
    "semantic/light/textSecondary": "#68748a",
    "semantic/light/textInverse": "#ffffff",
    "semantic/light/success": "#17a765",
    "semantic/light/danger": "#ef4444",
    "semantic/light/warning": "#f59e0b",
    "semantic/light/focus": "#176bff",
    "component/button/bg": "#176bff",
    "component/button/bgHover": "#0d55db",
    "component/button/fg": "#ffffff",
    "component/card/bg": "#ffffff",
    "component/card/border": "#e8ebf3",
    "component/nav/bg": "#ffffff",
    "component/nav/active": "#6d5dfc",
    "component/sheet/scrim": "#101322"
  };

  const floatTokens = {
    "primitive/space/0": 0,
    "primitive/space/1": 4,
    "primitive/space/2": 8,
    "primitive/space/3": 12,
    "primitive/space/4": 16,
    "primitive/space/5": 20,
    "primitive/space/6": 24,
    "primitive/space/8": 32,
    "primitive/space/10": 40,
    "primitive/radius/xs": 8,
    "primitive/radius/sm": 12,
    "primitive/radius/md": 16,
    "primitive/radius/lg": 22,
    "primitive/radius/xl": 28,
    "primitive/radius/pill": 999,
    "component/button/height": 48,
    "component/button/heightCompact": 44,
    "component/button/paddingX": 16,
    "component/button/radius": 16,
    "component/card/radius": 22,
    "component/card/padding": 16,
    "component/nav/height": 76,
    "component/nav/itemMinHeight": 56,
    "component/sheet/radius": 28,
    "component/layout/mobileWidth": 520,
    "component/layout/pagePadding": 14,
    "component/layout/sectionGap": 16,
    "motion/fast": 140,
    "motion/base": 220,
    "motion/slow": 320
  };

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = collections.find((c) => c.name === "QXwap Tokens");
  if (!collection) collection = figma.variables.createVariableCollection("QXwap Tokens");

  const modeId = collection.modes[0].modeId;
  try {
    collection.renameMode(modeId, "Light");
  } catch {}

  const existing = await figma.variables.getLocalVariablesAsync();
  function findExisting(name, type) {
    return existing.find((v) => v.name === name && v.resolvedType === type) || null;
  }

  function upsert(name, type, value) {
    let variable = findExisting(name, type);
    const created = !variable;
    if (!variable) variable = figma.variables.createVariable(name, collection, type);
    variable.setValueForMode(modeId, value);
    try {
      variable.setVariableCodeSyntax("WEB", `var(--qx-${name.replaceAll("/", "-")})`);
    } catch {}
    if (created) createdVariableIds.push(variable.id);
    else updatedVariableIds.push(variable.id);
    return variable;
  }

  for (const [name, value] of Object.entries(colorTokens)) {
    upsert(name, "COLOR", hexToColor(value));
  }

  for (const [name, value] of Object.entries(floatTokens)) {
    upsert(name, "FLOAT", px(value));
  }

  return {
    collectionId: collection.id,
    collectionName: collection.name,
    createdVariableIds,
    updatedVariableIds,
    colorCount: Object.keys(colorTokens).length,
    floatCount: Object.keys(floatTokens).length,
    warnings,
    note: "Created/updated QXwap Figma Variables for colors, spacing, radius, sizing, and motion. Run components after this so fills/strokes can bind."
  };
})().then(function(result) {
  console.log("[QXwap Variables] Done ✅", JSON.stringify(result, null, 2));
}).catch(function(err) {
  console.error("[QXwap Variables] Error ❌", err);
});
