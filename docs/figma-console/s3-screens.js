// QXwap Figma Console Script — paste into Figma Plugins > Development > Open Console
// Source: figma-mcp-component-screens-script.js
// ─────────────────────────────────────────────────────────────────────
(async function qxwapScript() {

const createdNodeIds = [];
const mutatedNodeIds = [];
const archivedNodeIds = [];
const warnings = [];

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
  brand: rgb("#176bff"),
  brandSoft: rgb("#eaf3ff"),
  page: rgb("#fbfcff"),
  surface: rgb("#ffffff"),
  surfaceSubtle: rgb("#f3f6ff"),
  border: rgb("#e8ebf3"),
  text: rgb("#101322"),
  muted: rgb("#68748a"),
  danger: rgb("#ef4444"),
  successSoft: rgb("#ecfdf5")
};

function paint(color) {
  return [{ type: "SOLID", color }];
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

function setupAuto(node, direction = "VERTICAL", gap = 12, pad = 0) {
  node.layoutMode = direction;
  node.itemSpacing = gap;
  node.paddingTop = pad;
  node.paddingRight = pad;
  node.paddingBottom = pad;
  node.paddingLeft = pad;
  node.primaryAxisSizingMode = "AUTO";
  node.counterAxisSizingMode = "AUTO";
  node.counterAxisAlignItems = direction === "VERTICAL" ? "MIN" : "CENTER";
}

function text(label, size = 14, bold = false, color = C.text) {
  const t = figma.createText();
  t.characters = label;
  t.fontName = bold ? FONT_BOLD : FONT;
  t.fontSize = size;
  t.lineHeight = { unit: "PERCENT", value: 125 };
  t.fills = paint(color);
  return t;
}

function rect(name, w, h, radius, color) {
  const r = figma.createRectangle();
  r.name = name;
  r.resize(w, h);
  r.cornerRadius = radius;
  r.fills = paint(color);
  r.strokes = paint(C.border);
  r.strokeWeight = 1;
  return r;
}

async function allComponents() {
  const found = [];
  for (const page of figma.root.children) {
    await figma.setCurrentPageAsync(page);
    found.push(...page.findAll((node) => node.type === "COMPONENT"));
  }
  return found;
}

const components = await allComponents();

function componentByVariant(setName, props) {
  const expected = Object.entries(props).map(([k, v]) => `${k}=${v}`).join(", ");
  const match = components.find((c) => {
    const parentName = c.parent?.name || "";
    return parentName === setName && c.name === expected;
  });
  if (!match) {
    warnings.push(`Missing component: ${setName} / ${expected}`);
    return null;
  }
  return match.createInstance();
}

function fallbackCard(label, w = 360, h = 80) {
  const f = figma.createFrame();
  f.name = `Fallback / ${label}`;
  f.resize(w, h);
  setupAuto(f, "VERTICAL", 8, 14);
  f.cornerRadius = 18;
  f.fills = paint(C.surface);
  f.strokes = paint(C.border);
  f.strokeWeight = 1;
  f.appendChild(text(label, 14, true));
  f.appendChild(text("Missing component instance fallback", 11, false, C.muted));
  return f;
}

function inst(setName, props, fallbackLabel, w = 180, h = 48) {
  const node = componentByVariant(setName, props);
  if (node) return node;
  return fallbackCard(fallbackLabel || `${setName}`, w, h);
}

function makePhone(screenName) {
  const phone = figma.createFrame();
  phone.name = `Screen / ${screenName}`;
  phone.resize(390, 844);
  setupAuto(phone, "VERTICAL", 14, 18);
  phone.counterAxisAlignItems = "CENTER";
  phone.fills = paint(C.page);
  phone.cornerRadius = 32;
  phone.strokes = paint(C.border);
  phone.strokeWeight = 1;
  phone.effects = shadow(18, 42, 0.12);
  createdNodeIds.push(phone.id);
  return phone;
}

function topbar(title = "QXwap", showSearch = true) {
  const bar = figma.createFrame();
  bar.name = "Topbar";
  bar.resize(354, 56);
  setupAuto(bar, "HORIZONTAL", 10, 0);
  bar.fills = [];
  const brand = text(title, 24, true, C.text);
  bar.appendChild(brand);
  if (showSearch) {
    const search = inst("QXwap/Icon", { Name: "Search" }, "Icon/Search", 48, 48);
    bar.appendChild(search);
    const notification = inst("QXwap/Icon", { Name: "Notification" }, "Icon/Notification", 48, 48);
    bar.appendChild(notification);
  }
  return bar;
}

function nav(activeTab = "Feed", badgeTab = "") {
  const frame = figma.createFrame();
  frame.name = "Bottom Nav";
  frame.resize(354, 76);
  setupAuto(frame, "HORIZONTAL", 0, 8);
  frame.counterAxisAlignItems = "CENTER";
  frame.fills = paint(C.surface);
  frame.strokes = paint(C.border);
  frame.strokeWeight = 1;
  frame.cornerRadius = 28;
  frame.effects = shadow(-10, 28, 0.10, [16, 24, 40]);
  for (const tab of ["Feed", "Shop", "Add", "Inbox", "Profile"]) {
    const state = tab === activeTab ? "active" : tab === badgeTab ? "badge" : "default";
    const item = inst("QXwap/Bottom Nav Item", { Tab: tab, State: state }, `Nav ${tab}`, 76, 64);
    frame.appendChild(item);
  }
  return frame;
}

function spacer(h = 1) {
  const s = figma.createFrame();
  s.name = "Spacer";
  s.resize(354, h);
  s.fills = [];
  return s;
}

function sectionTitle(label) {
  const t = text(label, 18, true, C.text);
  t.name = `Section / ${label}`;
  return t;
}

function addBottom(phone, activeTab, badgeTab = "") {
  phone.appendChild(spacer(1));
  phone.appendChild(nav(activeTab, badgeTab));
}

function buildFeed() {
  const p = makePhone("Feed");
  p.appendChild(topbar("QXwap"));
  p.appendChild(sectionTitle("AI Feed"));
  p.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Following chip", 140, 38));
  p.appendChild(inst("QXwap/Product Card", { Layout: "Feed", State: "default" }, "Feed card", 390, 420));
  p.appendChild(inst("QXwap/Product Card", { Layout: "Feed", State: "saved" }, "Feed saved card", 390, 420));
  addBottom(p, "Feed", "Inbox");
  return p;
}

function buildShop() {
  const p = makePhone("Shop");
  p.appendChild(topbar("Shop"));
  p.appendChild(inst("QXwap/Input", { Type: "search", State: "default" }, "Search input", 280, 64));
  const filters = figma.createFrame();
  filters.name = "Filter chips";
  setupAuto(filters, "HORIZONTAL", 8, 0);
  filters.fills = [];
  filters.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Selected chip", 140, 38));
  filters.appendChild(inst("QXwap/Chip", { Type: "default" }, "Default chip", 140, 38));
  p.appendChild(filters);
  const grid = figma.createFrame();
  grid.name = "Shop grid";
  setupAuto(grid, "HORIZONTAL", 12, 0);
  grid.fills = [];
  grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "default" }, "Shop card", 184, 292));
  grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "saved" }, "Shop saved card", 184, 292));
  p.appendChild(grid);
  addBottom(p, "Shop");
  return p;
}

function buildDetail() {
  const p = makePhone("Detail");
  p.appendChild(topbar("Detail", false));
  p.appendChild(rect("Product hero image", 354, 300, 28, C.brandSoft));
  p.appendChild(fallbackCard("หนังสือ Design Systems · เปิดรับ Xwap", 354, 96));
  p.appendChild(inst("QXwap/Button", { Type: "Xwap", State: "default" }, "Xwap button", 176, 48));
  addBottom(p, "Shop");
  return p;
}

function buildProfile() {
  const p = makePhone("Profile");
  p.appendChild(topbar("Profile", false));
  p.appendChild(fallbackCard("Profile header · QServeep User", 354, 120));
  const tabs = figma.createFrame();
  tabs.name = "Profile tabs";
  setupAuto(tabs, "HORIZONTAL", 8, 0);
  tabs.fills = [];
  tabs.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Listings", 140, 38));
  tabs.appendChild(inst("QXwap/Chip", { Type: "default" }, "Saved", 140, 38));
  p.appendChild(tabs);
  const grid = figma.createFrame();
  grid.name = "Profile product grid";
  setupAuto(grid, "HORIZONTAL", 12, 0);
  grid.fills = [];
  grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "owner" }, "Owner card", 184, 292));
  grid.appendChild(inst("QXwap/Product Card", { Layout: "Shop", State: "default" }, "Shop card", 184, 292));
  p.appendChild(grid);
  addBottom(p, "Profile");
  return p;
}

function buildAdd() {
  const p = makePhone("Add Product");
  p.appendChild(topbar("Add", false));
  p.appendChild(sectionTitle("เลือกประเภทดีล"));
  const chips = figma.createFrame();
  chips.name = "Deal type chips";
  setupAuto(chips, "HORIZONTAL", 8, 0);
  chips.fills = [];
  chips.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Swap", 140, 38));
  chips.appendChild(inst("QXwap/Chip", { Type: "default" }, "Sell", 140, 38));
  p.appendChild(chips);
  p.appendChild(inst("QXwap/Input", { Type: "text", State: "default" }, "Title input", 280, 64));
  p.appendChild(rect("Upload image area", 354, 170, 24, C.surfaceSubtle));
  p.appendChild(inst("QXwap/Button", { Type: "Primary", State: "default" }, "Publish", 176, 48));
  addBottom(p, "Add");
  return p;
}

function buildOffer() {
  const p = makePhone("Offer Sheet");
  p.appendChild(topbar("Offer", false));
  p.appendChild(inst("QXwap/Sheet", { Type: "Offer", State: "open" }, "Offer sheet", 390, 360));
  p.appendChild(inst("QXwap/Sheet", { Type: "Offer", State: "success" }, "Offer success", 390, 360));
  addBottom(p, "Inbox");
  return p;
}

function buildInbox() {
  const p = makePhone("Inbox");
  p.appendChild(topbar("Inbox", false));
  const tabs = figma.createFrame();
  tabs.name = "Inbox tabs";
  setupAuto(tabs, "HORIZONTAL", 8, 0);
  tabs.fills = [];
  tabs.appendChild(inst("QXwap/Chip", { Type: "selected" }, "Xwap", 140, 38));
  tabs.appendChild(inst("QXwap/Chip", { Type: "default" }, "Notifications", 140, 38));
  p.appendChild(tabs);
  p.appendChild(fallbackCard("Offer card · สินค้า 2 ชิ้น + 120 บาท", 354, 110));
  p.appendChild(fallbackCard("Notification card · มีคนบันทึกสินค้า", 354, 96));
  addBottom(p, "Inbox", "Inbox");
  return p;
}

function buildWalletShipment() {
  const p = makePhone("Wallet / Shipment");
  p.appendChild(topbar("Wallet", false));
  const wallet = figma.createFrame();
  wallet.name = "Wallet card";
  wallet.resize(354, 160);
  setupAuto(wallet, "VERTICAL", 10, 20);
  wallet.cornerRadius = 28;
  wallet.fills = paint(C.brand);
  wallet.effects = shadow(18, 36, 0.24, [47, 123, 255]);
  wallet.appendChild(text("QXwap Credit", 14, true, C.surface));
  wallet.appendChild(text("1,240", 34, true, C.surface));
  wallet.appendChild(text("แค่เริ่มสะสมเครดิต", 13, false, C.surface));
  p.appendChild(wallet);
  p.appendChild(fallbackCard("Shipment status · รอเข้ารับสินค้า", 354, 120));
  addBottom(p, "Profile");
  return p;
}

// Archive raw HTML captures by moving non-essential pages to Archive.
// This is conservative: it never archives component/script pages or the new screen page.
let archive = figma.root.children.find((p) => p.name === "99 Archive - HTML Captures");
if (!archive) {
  archive = figma.createPage();
  archive.name = "99 Archive - HTML Captures";
}

const protectedPageNames = new Set([
  "02 Components - Real Variants",
  "02 Components - MCP Generated",
  "04 Screens - Component Instances",
  "99 Archive - HTML Captures"
]);

for (const page of [...figma.root.children]) {
  if (protectedPageNames.has(page.name)) continue;
  const shouldArchive =
    /capture|final package|addendum|mobile strip|token|handoff|prototype|html/i.test(page.name) ||
    page.children.some((n) => /html|capture|figma final package|addendum/i.test(n.name));
  if (!shouldArchive) continue;
  await figma.setCurrentPageAsync(page);
  for (const node of [...page.children]) {
    node.name = `Archived / ${page.name} / ${node.name}`;
    archive.appendChild(node);
    archivedNodeIds.push(node.id);
  }
}

let screensPage = figma.root.children.find((p) => p.name === "04 Screens - Component Instances");
if (!screensPage) {
  screensPage = figma.createPage();
  screensPage.name = "04 Screens - Component Instances";
}
await figma.setCurrentPageAsync(screensPage);
screensPage.children.forEach((n) => n.remove());

const screens = [
  buildFeed(),
  buildShop(),
  buildDetail(),
  buildProfile(),
  buildAdd(),
  buildOffer(),
  buildInbox(),
  buildWalletShipment()
];

screens.forEach((screen, index) => {
  screen.x = 80 + (index % 4) * 430;
  screen.y = 120 + Math.floor(index / 4) * 920;
  screensPage.appendChild(screen);
});

const label = text("QXwap 8 Screens - Built from Real Components", 32, true, C.text);
label.x = 80;
label.y = 48;
screensPage.appendChild(label);
createdNodeIds.push(label.id);

figma.viewport.scrollAndZoomIntoView(screens);

return {
  createdNodeIds,
  mutatedNodeIds,
  archivedNodeIds,
  screenCount: screens.length,
  pageName: screensPage.name,
  archivePageName: archive.name,
  warnings,
  note: "Rebuilt 8 QXwap screens from real component instances with Auto Layout. Check warnings for missing component variants/fallbacks."
};


})().then(function(result) {
  console.log('[QXwap] Done ✅', JSON.stringify(result, null, 2));
}).catch(function(err) {
  console.error('[QXwap] Error ❌', err);
});
