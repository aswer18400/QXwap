// QXwap Figma Console Script — paste into Figma Plugins > Development > Open Console
// Source: figma-mcp-real-components-script.js
// ─────────────────────────────────────────────────────────────────────
(async function qxwapScript() {

const createdNodeIds = [];
const mutatedNodeIds = [];
const createdSetIds = [];

const FONT = { family: "Inter", style: "Regular" };
const FONT_BOLD = { family: "Inter", style: "Bold" };

try {
  await figma.loadFontAsync(FONT);
  await figma.loadFontAsync(FONT_BOLD);
} catch {
  const fonts = await figma.listAvailableFontsAsync();
  const interRegular = fonts.find((f) => f.fontName.family === "Inter")?.fontName;
  const fallback = interRegular || fonts[0].fontName;
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
  brand: rgb("#176bff"),
  brand2: rgb("#53a7ff"),
  brandSoft: rgb("#eaf3ff"),
  accent: rgb("#6d5dfc"),
  page: rgb("#fbfcff"),
  surface: rgb("#ffffff"),
  surfaceSubtle: rgb("#f3f6ff"),
  border: rgb("#e8ebf3"),
  text: rgb("#101322"),
  muted: rgb("#68748a"),
  danger: rgb("#ef4444"),
  dangerSoft: rgb("#fff1f2"),
  success: rgb("#17a765"),
  successSoft: rgb("#ecfdf5"),
  warning: rgb("#f59e0b"),
  transparent: { r: 1, g: 1, b: 1 }
};

const tokenNames = {
  brand: ["semantic/light/brand", "semantic.light.brand", "brand.primary", "primitive/color/blue/500", "primitive.color.blue.500"],
  brandHover: ["semantic/light/brandHover", "semantic.light.brandHover", "primitive/color/blue/600", "primitive.color.blue.600"],
  brandSoft: ["primitive/color/blue/50", "primitive.color.blue.50", "brand.soft"],
  accent: ["semantic/light/brandAccent", "semantic.light.brandAccent", "primitive/color/purple/500", "primitive.color.purple.500"],
  surface: ["semantic/light/surface", "semantic.light.surface", "surface.card", "primitive/color/gray/0", "primitive.color.gray.0"],
  surfaceSubtle: ["semantic/light/surfaceSubtle", "semantic.light.surfaceSubtle", "primitive/color/gray/100", "primitive.color.gray.100"],
  page: ["semantic/light/page", "semantic.light.page", "surface.page", "primitive/color/gray/50", "primitive.color.gray.50"],
  border: ["semantic/light/border", "semantic.light.border", "primitive/color/gray/200", "primitive.color.gray.200"],
  text: ["semantic/light/textPrimary", "semantic.light.textPrimary", "text.primary", "primitive/color/gray/900", "primitive.color.gray.900"],
  muted: ["semantic/light/textSecondary", "semantic.light.textSecondary", "text.secondary", "primitive/color/gray/600", "primitive.color.gray.600"],
  inverse: ["semantic/light/textInverse", "semantic.light.textInverse", "primitive/color/gray/0", "primitive.color.gray.0"],
  danger: ["semantic/light/danger", "semantic.light.danger", "status.error", "primitive/color/red/500", "primitive.color.red.500"],
  success: ["semantic/light/success", "semantic.light.success", "status.success", "primitive/color/green/500", "primitive.color.green.500"],
  warning: ["semantic/light/warning", "semantic.light.warning", "status.warning", "primitive/color/amber/500", "primitive.color.amber.500"]
};

const floatTokenNames = {
  space1: ["primitive/space/1", "primitive.space.1"],
  space2: ["primitive/space/2", "primitive.space.2"],
  space3: ["primitive/space/3", "primitive.space.3"],
  space4: ["primitive/space/4", "primitive.space.4"],
  buttonHeight: ["component/button/height", "component.button.height"],
  buttonPaddingX: ["component/button/paddingX", "component.button.paddingX"],
  buttonRadius: ["component/button/radius", "component.button.radius"],
  cardRadius: ["component/card/radius", "component.card.radius"],
  cardPadding: ["component/card/padding", "component.card.padding"],
  navHeight: ["component/nav/height", "component.nav.height"],
  navItemMinHeight: ["component/nav/itemMinHeight", "component.nav.itemMinHeight"],
  sheetRadius: ["component/sheet/radius", "component.sheet.radius"],
  pagePadding: ["component/layout/pagePadding", "component.layout.pagePadding"],
  radiusMd: ["primitive/radius/md", "primitive.radius.md"],
  radiusLg: ["primitive/radius/lg", "primitive.radius.lg"],
  radiusXl: ["primitive/radius/xl", "primitive.radius.xl"],
  radiusPill: ["primitive/radius/pill", "primitive.radius.pill"]
};

const localVars = await figma.variables.getLocalVariablesAsync();
function normalizeName(name) {
  return String(name).replace(/[._]/g, "/").replace(/^QXwap\//, "").toLowerCase();
}
function findVariable(candidates) {
  const wanted = candidates.map(normalizeName);
  return localVars.find((v) => wanted.includes(normalizeName(v.name))) || null;
}
const vars = {};
for (const [key, names] of Object.entries(tokenNames)) vars[key] = findVariable(names);
const floatVars = {};
for (const [key, names] of Object.entries(floatTokenNames)) floatVars[key] = findVariable(names);

function paint(color, tokenKey) {
  const base = { type: "SOLID", color };
  const variable = vars[tokenKey];
  if (!variable) return [base];
  try {
    return [figma.variables.setBoundVariableForPaint(base, "color", variable)];
  } catch {
    return [base];
  }
}
function fill(node, color, tokenKey) {
  node.fills = paint(color, tokenKey);
}
function stroke(node, color, tokenKey) {
  node.strokes = paint(color, tokenKey);
}
function bindFloat(node, prop, tokenKey) {
  const variable = floatVars[tokenKey];
  if (!variable || typeof node.setBoundVariable !== "function") return;
  try {
    node.setBoundVariable(prop, variable);
  } catch {}
}
function bindRadius(node, tokenKey) {
  bindFloat(node, "topLeftRadius", tokenKey);
  bindFloat(node, "topRightRadius", tokenKey);
  bindFloat(node, "bottomLeftRadius", tokenKey);
  bindFloat(node, "bottomRightRadius", tokenKey);
}

function shadow(y = 14, radius = 32, alpha = 0.09, color = [35, 50, 90]) {
  const [r, g, b] = color;
  return [{
    type: "DROP_SHADOW",
    color: { r: r / 255, g: g / 255, b: b / 255, a: alpha },
    offset: { x: 0, y },
    radius,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  }];
}

function text(label, size = 14, bold = false, color = C.text, tokenKey = "text") {
  const t = figma.createText();
  t.characters = label;
  t.fontName = bold ? FONT_BOLD : FONT;
  t.fontSize = size;
  t.lineHeight = { unit: "PERCENT", value: 120 };
  fill(t, color, tokenKey);
  return t;
}

function setupAuto(node, direction = "HORIZONTAL", gap = 8, pad = 0, gapToken = null, padToken = null) {
  node.layoutMode = direction;
  node.itemSpacing = gap;
  node.paddingTop = pad;
  node.paddingRight = pad;
  node.paddingBottom = pad;
  node.paddingLeft = pad;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.counterAxisAlignItems = "CENTER";
  if (gapToken) bindFloat(node, "itemSpacing", gapToken);
  if (padToken) {
    bindFloat(node, "paddingTop", padToken);
    bindFloat(node, "paddingRight", padToken);
    bindFloat(node, "paddingBottom", padToken);
    bindFloat(node, "paddingLeft", padToken);
  }
}

function component(name, width, height, build, widthToken = null, heightToken = null) {
  const c = figma.createComponent();
  c.name = name;
  c.resize(width, height);
  if (widthToken) bindFloat(c, "width", widthToken);
  if (heightToken) bindFloat(c, "height", heightToken);
  fill(c, C.surface, "surface");
  stroke(c, C.border, "border");
  c.strokeWeight = 1;
  c.cornerRadius = 20;
  bindRadius(c, "radiusLg");
  build(c);
  createdNodeIds.push(c.id);
  return c;
}

function rect(name, w, h, radius, color, tokenKey, radiusToken = null) {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(w, h);
  r.cornerRadius = radius;
  if (radiusToken) bindRadius(r, radiusToken);
  fill(r, color, tokenKey);
  return r;
}

function iconDot(name = "Icon", color = C.text, tokenKey = "text") {
  const f = figma.createFrame();
  f.name = name;
  f.resize(24, 24);
  f.fills = [];
  const a = figma.createEllipse();
  a.resize(18, 18);
  a.x = 3;
  a.y = 3;
  a.fills = [];
  stroke(a, color, tokenKey);
  a.strokeWeight = 2.25;
  f.appendChild(a);
  return f;
}

function statusChip(label, bg, fg, bgToken, fgToken) {
  const f = figma.createFrame();
  f.name = `Chip / ${label}`;
  setupAuto(f, "HORIZONTAL", 6, 10, null, "space2");
  f.cornerRadius = 999;
  bindRadius(f, "radiusPill");
  fill(f, bg, bgToken);
  const t = text(label, 12, true, fg, fgToken);
  f.appendChild(t);
  return f;
}

function makeVariantSet(page, setName, comps, x, y) {
  comps.forEach((c, i) => {
    c.x = x + (i % 4) * (c.width + 24);
    c.y = y + Math.floor(i / 4) * (c.height + 28);
    page.appendChild(c);
  });
  const set = figma.combineAsVariants(comps, page);
  set.name = setName;
  set.x = x;
  set.y = y;
  createdSetIds.push(set.id);
  return set;
}

function variantName(props) {
  return Object.entries(props).map(([k, v]) => `${k}=${v}`).join(", ");
}

function makeButton(type, state) {
  return component(variantName({ Type: type, State: state }), 176, 48, (c) => {
    setupAuto(c, "HORIZONTAL", 8, 16, "space2", "buttonPaddingX");
    c.cornerRadius = 16;
    bindRadius(c, "buttonRadius");
    c.effects = type === "Primary" || type === "Xwap" ? shadow(12, 28, 0.28, [23, 107, 255]) : [];
    if (type === "Primary" || type === "Xwap") fill(c, C.brand, "brand");
    if (type === "Secondary") fill(c, C.surface, "surface");
    if (type === "Danger") fill(c, C.dangerSoft, null);
    stroke(c, type === "Danger" ? C.danger : type === "Secondary" ? C.border : C.brand, type === "Danger" ? "danger" : type === "Secondary" ? "border" : "brand");
    if (state === "pressed") c.y += 1;
    if (state === "disabled") c.opacity = 0.48;
    const labelColor = type === "Secondary" ? C.text : type === "Danger" ? C.danger : C.surface;
    const token = type === "Secondary" ? "text" : type === "Danger" ? "danger" : "inverse";
    if (state === "loading") c.appendChild(iconDot("Spinner", labelColor, token));
    c.appendChild(text(state === "loading" ? "กำลังโหลด" : type, 14, true, labelColor, token));
  }, null, "buttonHeight");
}

function makeProductCard(layout, state) {
  const isFeed = layout === "Feed";
  return component(variantName({ Layout: layout, State: state }), isFeed ? 390 : 184, isFeed ? 420 : 292, (c) => {
    setupAuto(c, "VERTICAL", 12, 14, "space3", "cardPadding");
    c.cornerRadius = isFeed ? 28 : 22;
    bindRadius(c, isFeed ? "radiusXl" : "cardRadius");
    c.effects = shadow(isFeed ? 18 : 14, isFeed ? 42 : 32, 0.11);
    if (state === "loading") c.opacity = 0.56;
    const imageRow = figma.createFrame();
    imageRow.name = "Images";
    setupAuto(imageRow, "HORIZONTAL", 10, 0, "space2", null);
    imageRow.fills = [];
    imageRow.appendChild(rect("Product image", isFeed ? 174 : 156, isFeed ? 184 : 156, 18, C.brandSoft, "brandSoft", "radiusMd"));
    if (isFeed) imageRow.appendChild(rect("Wanted preview", 174, 184, 18, C.surfaceSubtle, "surfaceSubtle", "radiusMd"));
    c.appendChild(imageRow);
    const titleRow = figma.createFrame();
    titleRow.name = "Title row";
    setupAuto(titleRow, "HORIZONTAL", 8, 0, "space2", null);
    titleRow.fills = [];
    titleRow.appendChild(text("หนังสือ Design Systems", isFeed ? 17 : 14, true, C.text, "text"));
    titleRow.appendChild(statusChip(state === "owner" ? "Owner" : "เปิดรับ Xwap", C.brandSoft, C.brand, "brandSoft", "brand"));
    c.appendChild(titleRow);
    c.appendChild(text("@มะลิ Swap Studio · Bangkok", 12, false, C.muted, "muted"));
    const tags = figma.createFrame();
    tags.name = "Tags";
    setupAuto(tags, "HORIZONTAL", 6, 0, null, null);
    tags.fills = [];
    tags.appendChild(statusChip("#หนังสือ", C.surfaceSubtle, C.muted, "surfaceSubtle", "muted"));
    tags.appendChild(statusChip("#เครดิต", C.surfaceSubtle, C.muted, "surfaceSubtle", "muted"));
    c.appendChild(tags);
    const actions = figma.createFrame();
    actions.name = "Actions";
    setupAuto(actions, "HORIZONTAL", 8, 0, "space2", null);
    actions.fills = [];
    actions.appendChild(statusChip(state === "saved" ? "Saved" : "Save", state === "saved" ? C.brandSoft : C.surfaceSubtle, state === "saved" ? C.brand : C.muted, state === "saved" ? "brandSoft" : "surfaceSubtle", state === "saved" ? "brand" : "muted"));
    actions.appendChild(statusChip("Xwap", C.brand, C.surface, "brand", "inverse"));
    c.appendChild(actions);
  });
}

function makeBottomNav(tab, state) {
  return component(variantName({ Tab: tab, State: state }), 76, 64, (c) => {
    setupAuto(c, "VERTICAL", 4, 8, "space1", "space2");
    c.cornerRadius = 18;
    bindRadius(c, "radiusMd");
    c.effects = [];
    fill(c, state === "active" ? C.brandSoft : C.surface, state === "active" ? "brandSoft" : "surface");
    stroke(c, state === "active" ? C.brandSoft : C.border, state === "active" ? "brandSoft" : "border");
    c.appendChild(iconDot("Icon", state === "active" ? C.brand : C.muted, state === "active" ? "brand" : "muted"));
    const label = text(tab, 10, true, state === "active" ? C.brand : C.muted, state === "active" ? "brand" : "muted");
    c.appendChild(label);
    if (state === "badge") {
      const b = rect("Badge", 16, 16, 999, C.danger, "danger");
      b.x = 48;
      b.y = 4;
      c.appendChild(b);
    }
  });
}

function makeInput(kind, state) {
  return component(variantName({ Type: kind, State: state }), 280, 64, (c) => {
    setupAuto(c, "HORIZONTAL", 10, 14, "space2", "pagePadding");
    c.cornerRadius = 16;
    bindRadius(c, "buttonRadius");
    c.effects = [];
    fill(c, state === "disabled" ? C.surfaceSubtle : C.surface, state === "disabled" ? "surfaceSubtle" : "surface");
    stroke(c, state === "focus" ? C.brand : state === "error" ? C.danger : C.border, state === "focus" ? "brand" : state === "error" ? "danger" : "border");
    if (kind === "search") c.appendChild(iconDot("Search icon", C.muted, "muted"));
    c.appendChild(text(kind === "password" ? "••••••••" : kind === "search" ? "ค้นหา" : "ข้อความ", 14, false, state === "disabled" ? C.muted : C.text, state === "disabled" ? "muted" : "text"));
    if (state === "disabled") c.opacity = 0.55;
  });
}

function makeSheet(type, state) {
  return component(variantName({ Type: type, State: state }), 390, 360, (c) => {
    setupAuto(c, "VERTICAL", 14, 18, "space3", "space4");
    c.cornerRadius = 30;
    bindRadius(c, "sheetRadius");
    c.effects = shadow(-18, 46, 0.18, [16, 24, 40]);
    if (state === "loading") c.opacity = 0.7;
    c.appendChild(rect("Handle", 48, 5, 999, rgb("#cbd5e1"), null, "radiusPill"));
    c.appendChild(text(`${type} Sheet`, 20, true, C.text, "text"));
    c.appendChild(rect("Field / row", 350, 46, 16, C.surfaceSubtle, "surfaceSubtle", "radiusMd"));
    c.appendChild(rect("Content area", 350, 92, 18, state === "error" ? C.dangerSoft : state === "success" ? C.successSoft : C.surfaceSubtle, state === "success" ? null : "surfaceSubtle", "radiusMd"));
    c.appendChild(statusChip(state === "success" ? "สำเร็จ" : state === "error" ? "เกิดข้อผิดพลาด" : state === "loading" ? "กำลังโหลด" : "ยืนยัน", state === "error" ? C.danger : C.brand, C.surface, state === "error" ? "danger" : "brand", "inverse"));
  });
}

function makeChip(type) {
  return component(variantName({ Type: type }), 140, 38, (c) => {
    setupAuto(c, "HORIZONTAL", 6, 12, null, "space3");
    c.cornerRadius = 999;
    bindRadius(c, "radiusPill");
    if (type === "selected") fill(c, C.brandSoft, "brandSoft");
    else if (type === "level") fill(c, C.successSoft, null);
    else fill(c, C.surfaceSubtle, "surfaceSubtle");
    stroke(c, type === "selected" ? C.brand : C.border, type === "selected" ? "brand" : "border");
    c.appendChild(text(type === "level" ? "Level 2" : type === "selected" ? "Selected" : "Default", 12, true, type === "selected" ? C.brand : type === "level" ? C.success : C.muted, type === "selected" ? "brand" : type === "level" ? "success" : "muted"));
  });
}

function makeIcon(name) {
  return component(`Name=${name}`, 56, 56, (c) => {
    setupAuto(c, "VERTICAL", 0, 16, null, "space4");
    c.cornerRadius = 16;
    bindRadius(c, "radiusMd");
    c.effects = [];
    c.appendChild(iconDot(`Icon / ${name}`, C.text, "text"));
  });
}

let page = figma.root.children.find((p) => p.name === "02 Components - Real Variants");
if (!page) {
  page = figma.createPage();
  page.name = "02 Components - Real Variants";
}
await figma.setCurrentPageAsync(page);
page.children.forEach((n) => n.remove());

const title = figma.createFrame();
title.name = "QXwap Component Library - Real Variants";
setupAuto(title, "VERTICAL", 10, 40);
title.x = 80;
title.y = 80;
fill(title, C.page, "page");
page.appendChild(title);
createdNodeIds.push(title.id);
title.appendChild(text("QXwap Component Library - Real Variants", 32, true, C.text, "text"));
title.appendChild(text("Generated by docs/figma-mcp-real-components-script.js. Components use Auto Layout and bind variables when matching Figma Variables exist.", 14, false, C.muted, "muted"));

let y = 240;
function addSet(setName, comps) {
  const heading = text(setName, 24, true, C.text, "text");
  heading.x = 80;
  heading.y = y;
  page.appendChild(heading);
  createdNodeIds.push(heading.id);
  y += 50;
  const set = makeVariantSet(page, setName, comps, 80, y);
  y += set.height + 90;
  return set;
}

addSet("QXwap/Button", ["Primary", "Xwap", "Secondary", "Danger"].flatMap((type) => ["default", "pressed", "disabled", "loading"].map((state) => makeButton(type, state))));
addSet("QXwap/Product Card", ["Feed", "Shop"].flatMap((layout) => ["default", "saved", "owner", "loading"].map((state) => makeProductCard(layout, state))));
addSet("QXwap/Bottom Nav Item", ["Feed", "Shop", "Add", "Inbox", "Profile"].flatMap((tab) => ["default", "active", "badge"].map((state) => makeBottomNav(tab, state))));
addSet("QXwap/Input", ["text", "search", "password"].flatMap((type) => ["default", "focus", "error", "disabled"].map((state) => makeInput(type, state))));
addSet("QXwap/Sheet", ["Offer", "Filter", "Auth", "Search"].flatMap((type) => ["open", "loading", "error", "success"].map((state) => makeSheet(type, state))));
addSet("QXwap/Chip", ["default", "selected", "level"].map(makeChip));
addSet("QXwap/Icon", ["Search","Filter","Bell","Home","Shop","Add","Inbox","Profile","Back","Close","More","Xwap","Offer","Swap","Buy","Sell","Both","Wanted","Package","Save","Saved","Share","View","Image","Camera","Wallet","Credit","CreditReward","Cash","Deposit","Transaction","User","Avatar","Follow","Following","Level","Registered","Restricted","Verified","FastResponder","Featured","Settings","Edit","Delete","Chat","Send","Comment","Notification","Unread","Shipment","Proof","Pickup","Delivery","Location","Nearby","Distance","Success","Error","Warning","Info","Loading","Empty","Lock","Unlock","Calendar","Sort","Category","Condition","Price","Tag","List","Grid","External"].map(makeIcon));

figma.viewport.scrollAndZoomIntoView(page.children);

return {
  createdNodeIds,
  mutatedNodeIds,
  createdSetIds,
  componentSetCount: createdSetIds.length,
  variableBindingAvailable: Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, Boolean(v)])),
  floatVariableBindingAvailable: Object.fromEntries(Object.entries(floatVars).map(([k, v]) => [k, Boolean(v)])),
  pageName: page.name,
  note: "Created P0/P1/P2 QXwap real components with variants, Auto Layout, color variable binding, and key spacing/radius/height variable binding."
};


})().then(function(result) {
  console.log('[QXwap] Done ✅', JSON.stringify(result, null, 2));
}).catch(function(err) {
  console.error('[QXwap] Error ❌', err);
});
