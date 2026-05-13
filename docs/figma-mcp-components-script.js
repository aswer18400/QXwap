/*
 * QXwap Figma MCP Component Generator
 *
 * Use with Figma MCP `use_figma` after quota is available.
 *
 * Target file:
 *   3BHvaNXqmDQJsqpfanxtHL
 *
 * Paste this entire file as the `code` value for use_figma.
 * Required use_figma options:
 *   fileKey: "3BHvaNXqmDQJsqpfanxtHL"
 *   skillNames: "figma-use"
 *
 * This script creates reproducible starter components:
 * - Button / Primary, Secondary, Xwap, Danger
 * - Input / Default, Focus, Error, Disabled
 * - Card / Product
 * - Chip / Default, Selected
 * - IconButton / Default, Active, Disabled
 * - BottomNav / Item
 * - Sheet / BottomSheet
 * - EmptyState
 *
 * It intentionally creates real Figma COMPONENT nodes, not HTML capture frames.
 */

const createdNodeIds = [];
const mutatedNodeIds = [];

const FONT = { family: "Inter", style: "Regular" };
const FONT_BOLD = { family: "Inter", style: "Bold" };

try {
  await figma.loadFontAsync(FONT);
  await figma.loadFontAsync(FONT_BOLD);
} catch {
  const fonts = await figma.listAvailableFontsAsync();
  const fallback = fonts.find((f) => f.fontName.family === "Inter")?.fontName || fonts[0].fontName;
  FONT.family = fallback.family;
  FONT.style = fallback.style;
  FONT_BOLD.family = fallback.family;
  FONT_BOLD.style = fallback.style;
  await figma.loadFontAsync(FONT);
  await figma.loadFontAsync(FONT_BOLD);
}

function rgb(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255
  };
}

const C = {
  blue: rgb("#176bff"),
  blue2: rgb("#53a7ff"),
  blueSoft: rgb("#eaf3ff"),
  ink: rgb("#101322"),
  muted: rgb("#68748a"),
  page: rgb("#fbfcff"),
  card: rgb("#ffffff"),
  line: rgb("#e8ebf3"),
  danger: rgb("#ef4444"),
  dangerSoft: rgb("#fff1f2"),
  successSoft: rgb("#ecfdf5")
};

function solid(color) {
  return [{ type: "SOLID", color }];
}

function stroke(color) {
  return [{ type: "SOLID", color }];
}

function shadow(y = 14, blur = 32, alpha = 0.09) {
  return [{
    type: "DROP_SHADOW",
    color: { r: 35 / 255, g: 50 / 255, b: 90 / 255, a: alpha },
    offset: { x: 0, y },
    radius: blur,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  }];
}

function text(label, size = 14, bold = false, color = C.ink) {
  const t = figma.createText();
  t.characters = label;
  t.fontName = bold ? FONT_BOLD : FONT;
  t.fontSize = size;
  t.lineHeight = { unit: "PERCENT", value: 120 };
  t.fills = solid(color);
  return t;
}

function autoFrame(name, direction = "VERTICAL", gap = 10, padding = 16) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = direction;
  f.itemSpacing = gap;
  f.paddingTop = padding;
  f.paddingRight = padding;
  f.paddingBottom = padding;
  f.paddingLeft = padding;
  f.counterAxisSizingMode = "AUTO";
  f.primaryAxisSizingMode = "AUTO";
  f.fills = [];
  return f;
}

function makeComponent(name, width, height, build) {
  const c = figma.createComponent();
  c.name = name;
  c.resize(width, height);
  c.fills = solid(C.card);
  c.strokes = stroke(C.line);
  c.strokeWeight = 1;
  c.cornerRadius = 20;
  c.effects = shadow();
  build(c);
  createdNodeIds.push(c.id);
  return c;
}

function addCenteredLabel(parent, label, size = 14, bold = true, color = C.ink) {
  const t = text(label, size, bold, color);
  parent.appendChild(t);
  t.x = Math.max(0, (parent.width - t.width) / 2);
  t.y = Math.max(0, (parent.height - t.height) / 2);
  return t;
}

function makeButton(name, bg, fg, strokeColor, stateLabel) {
  return makeComponent(name, 180, 48, (c) => {
    c.cornerRadius = 16;
    c.fills = solid(bg);
    c.strokes = stroke(strokeColor || bg);
    c.effects = bg === C.blue ? [{
      type: "DROP_SHADOW",
      color: { r: 23 / 255, g: 107 / 255, b: 255 / 255, a: 0.28 },
      offset: { x: 0, y: 12 },
      radius: 28,
      spread: 0,
      visible: true,
      blendMode: "NORMAL"
    }] : [];
    addCenteredLabel(c, stateLabel, 14, true, fg);
  });
}

function makeInput(name, borderColor, helper) {
  return makeComponent(name, 260, 68, (c) => {
    c.cornerRadius = 16;
    c.fills = solid(C.card);
    c.strokes = stroke(borderColor);
    c.effects = [];
    const label = text("Label", 11, true, C.muted);
    c.appendChild(label);
    label.x = 14;
    label.y = 10;
    const value = text(helper, 14, false, C.ink);
    c.appendChild(value);
    value.x = 14;
    value.y = 34;
  });
}

function makeIcon(parent, x, y, color = C.ink) {
  const e = figma.createEllipse();
  e.resize(24, 24);
  e.x = x;
  e.y = y;
  e.fills = solid(color);
  parent.appendChild(e);
  return e;
}

// Page setup
let page = figma.root.children.find((p) => p.name === "02 Components - MCP Generated");
if (!page) {
  page = figma.createPage();
  page.name = "02 Components - MCP Generated";
}
await figma.setCurrentPageAsync(page);
page.children.forEach((n) => n.remove());

const root = autoFrame("QXwap Components - Generated from MCP Script", "VERTICAL", 28, 40);
root.resize(1320, 100);
root.x = 100;
root.y = 100;
root.fills = solid(C.page);
page.appendChild(root);
createdNodeIds.push(root.id);

const title = text("QXwap Components - MCP Generated", 32, true, C.ink);
root.appendChild(title);

const note = text("Generated from docs/figma-mcp-components-script.js. These are real Figma component nodes and can be converted into component sets/variants.", 14, false, C.muted);
root.appendChild(note);

function section(name) {
  const s = autoFrame(name, "VERTICAL", 16, 0);
  s.fills = [];
  root.appendChild(s);
  const h = text(name, 22, true, C.ink);
  s.appendChild(h);
  const row = autoFrame(`${name} / Row`, "HORIZONTAL", 16, 0);
  row.fills = [];
  s.appendChild(row);
  return row;
}

const buttons = section("Buttons");
buttons.appendChild(makeButton("Button / Primary / Default", C.blue, C.card, C.blue, "Primary"));
buttons.appendChild(makeButton("Button / Xwap / Default", C.blue, C.card, C.blue, "Xwap"));
buttons.appendChild(makeButton("Button / Secondary / Default", C.card, C.ink, C.line, "Secondary"));
buttons.appendChild(makeButton("Button / Danger / Default", C.dangerSoft, C.danger, C.danger, "Danger"));
buttons.appendChild(makeButton("Button / Primary / Disabled", rgb("#f2f4f7"), C.muted, C.line, "Disabled"));

const inputs = section("Inputs");
inputs.appendChild(makeInput("Input / Default", C.line, "Placeholder"));
inputs.appendChild(makeInput("Input / Focus", C.blue, "Focused value"));
inputs.appendChild(makeInput("Input / Error", C.danger, "Error value"));
inputs.appendChild(makeInput("Input / Disabled", C.line, "Disabled"));
inputs.children[4].opacity = 0.55;

const cards = section("Cards");
cards.appendChild(makeComponent("Card / Product / Shop", 220, 310, (c) => {
  c.cornerRadius = 22;
  c.effects = shadow(14, 32, 0.09);
  const img = figma.createRectangle();
  img.name = "Product image";
  img.resize(188, 188);
  img.x = 16;
  img.y = 16;
  img.cornerRadius = 18;
  img.fills = [{ type: "SOLID", color: C.blueSoft }];
  c.appendChild(img);
  const title = text("Product title", 16, true, C.ink);
  c.appendChild(title);
  title.x = 16;
  title.y = 218;
  const meta = text("@owner · Bangkok", 12, false, C.muted);
  c.appendChild(meta);
  meta.x = 16;
  meta.y = 244;
  const btn = figma.createRectangle();
  btn.resize(188, 36);
  btn.x = 16;
  btn.y = 264;
  btn.cornerRadius = 18;
  btn.fills = solid(C.blue);
  c.appendChild(btn);
}));

cards.appendChild(makeComponent("Card / Feed / Recommendation", 360, 280, (c) => {
  c.cornerRadius = 28;
  c.effects = shadow(18, 42, 0.12);
  const left = figma.createRectangle();
  left.resize(156, 172);
  left.x = 18;
  left.y = 18;
  left.cornerRadius = 20;
  left.fills = solid(C.blueSoft);
  c.appendChild(left);
  const right = figma.createRectangle();
  right.resize(156, 172);
  right.x = 186;
  right.y = 18;
  right.cornerRadius = 20;
  right.fills = solid(rgb("#f3f6ff"));
  c.appendChild(right);
  const title = text("Product title · เปิดรับ Xwap", 17, true, C.ink);
  c.appendChild(title);
  title.x = 18;
  title.y = 210;
  const btn = figma.createRectangle();
  btn.resize(324, 44);
  btn.x = 18;
  btn.y = 230;
  btn.cornerRadius = 22;
  btn.fills = solid(C.blue);
  c.appendChild(btn);
}));

const chips = section("Chips");
chips.appendChild(makeButton("Chip / Default", rgb("#f2f4f7"), C.muted, rgb("#f2f4f7"), "Default"));
chips.appendChild(makeButton("Chip / Selected", C.blueSoft, C.blue, C.blueSoft, "Selected"));
chips.appendChild(makeButton("Chip / Deal", C.blue, C.card, C.blue, "Swap"));

const iconButtons = section("Icon Buttons");
iconButtons.appendChild(makeComponent("IconButton / Default", 48, 48, (c) => {
  c.cornerRadius = 16;
  c.effects = [];
  makeIcon(c, 12, 12);
}));
iconButtons.appendChild(makeComponent("IconButton / Active", 48, 48, (c) => {
  c.cornerRadius = 16;
  c.fills = solid(C.blueSoft);
  c.strokes = stroke(C.blue);
  c.effects = [];
  makeIcon(c, 12, 12, C.blue);
}));
iconButtons.appendChild(makeComponent("IconButton / Disabled", 48, 48, (c) => {
  c.cornerRadius = 16;
  c.effects = [];
  c.opacity = 0.45;
  makeIcon(c, 12, 12, C.muted);
}));

const nav = section("Navigation");
nav.appendChild(makeComponent("BottomNav / Item / Default", 72, 56, (c) => {
  c.cornerRadius = 18;
  c.effects = [];
  makeIcon(c, 24, 8, C.muted);
  const label = text("Feed", 10, true, C.muted);
  c.appendChild(label);
  label.x = 24;
  label.y = 36;
}));
nav.appendChild(makeComponent("BottomNav / Item / Active", 72, 56, (c) => {
  c.cornerRadius = 18;
  c.fills = solid(C.blueSoft);
  c.strokes = stroke(C.blueSoft);
  c.effects = [];
  makeIcon(c, 24, 8, C.blue);
  const label = text("Feed", 10, true, C.blue);
  c.appendChild(label);
  label.x = 24;
  label.y = 36;
}));

const sheets = section("Sheets");
sheets.appendChild(makeComponent("Sheet / BottomSheet", 360, 300, (c) => {
  c.cornerRadius = 28;
  c.effects = [{
    type: "DROP_SHADOW",
    color: { r: 16 / 255, g: 24 / 255, b: 40 / 255, a: 0.18 },
    offset: { x: 0, y: -18 },
    radius: 46,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  }];
  const handle = figma.createRectangle();
  handle.resize(48, 5);
  handle.x = 156;
  handle.y = 14;
  handle.cornerRadius = 999;
  handle.fills = solid(rgb("#cbd5e1"));
  c.appendChild(handle);
  const title = text("Sheet title", 20, true, C.ink);
  c.appendChild(title);
  title.x = 20;
  title.y = 42;
  const field = figma.createRectangle();
  field.resize(320, 48);
  field.x = 20;
  field.y = 84;
  field.cornerRadius = 16;
  field.fills = solid(rgb("#f8fafc"));
  field.strokes = stroke(C.line);
  c.appendChild(field);
  const btn = figma.createRectangle();
  btn.resize(320, 48);
  btn.x = 20;
  btn.y = 232;
  btn.cornerRadius = 24;
  btn.fills = solid(C.blue);
  c.appendChild(btn);
}));

const states = section("States");
states.appendChild(makeComponent("EmptyState / Default", 300, 180, (c) => {
  c.cornerRadius = 24;
  c.effects = [];
  const circle = figma.createEllipse();
  circle.resize(54, 54);
  circle.x = 123;
  circle.y = 22;
  circle.fills = solid(C.blueSoft);
  c.appendChild(circle);
  const title = text("ไม่มีรายการ", 18, true, C.ink);
  c.appendChild(title);
  title.x = 104;
  title.y = 94;
  const body = text("เริ่มจากเพิ่มสินค้า หรือค้นหาสิ่งที่อยากแลก", 12, false, C.muted);
  c.appendChild(body);
  body.x = 28;
  body.y = 124;
}));

figma.viewport.scrollAndZoomIntoView([root]);

return {
  createdNodeIds,
  mutatedNodeIds,
  componentCount: createdNodeIds.length - 1,
  pageName: page.name,
  note: "Created starter QXwap Figma components. Convert related components into component sets/variants manually or with a follow-up MCP script."
};
