// QXwap Figma Console Script — paste into Figma Plugins > Development > Open Console
// Source: figma-mcp-prototype-wiring-script.js
// ─────────────────────────────────────────────────────────────────────
(async function qxwapScript() {

const createdNodeIds = [];
const mutatedNodeIds = [];
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
  surface: rgb("#ffffff"),
  page: rgb("#fbfcff"),
  text: rgb("#101322"),
  muted: rgb("#68748a"),
  border: rgb("#e8ebf3"),
  danger: rgb("#ef4444"),
  dangerSoft: rgb("#fff1f2"),
  success: rgb("#17a765"),
  successSoft: rgb("#ecfdf5"),
  scrim: { r: 15 / 255, g: 18 / 255, b: 34 / 255 }
};

function paint(color, alpha = 1) {
  return [{ type: "SOLID", color, opacity: alpha }];
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

function button(label, type = "primary") {
  const b = figma.createFrame();
  b.name = `Prototype Button / ${label}`;
  setupAuto(b, "HORIZONTAL", 8, 16);
  b.cornerRadius = 999;
  b.fills = paint(type === "danger" ? C.danger : type === "ghost" ? C.brandSoft : C.brand);
  b.strokes = paint(type === "ghost" ? C.brand : type === "danger" ? C.danger : C.brand);
  b.strokeWeight = 1;
  b.appendChild(text(label, 14, true, type === "ghost" ? C.brand : C.surface));
  return b;
}

function card(label, body = "") {
  const f = figma.createFrame();
  f.name = `Prototype Card / ${label}`;
  f.resize(354, 110);
  setupAuto(f, "VERTICAL", 8, 16);
  f.cornerRadius = 22;
  f.fills = paint(C.surface);
  f.strokes = paint(C.border);
  f.strokeWeight = 1;
  f.appendChild(text(label, 18, true, C.text));
  if (body) f.appendChild(text(body, 13, false, C.muted));
  return f;
}

function hotspot(name, x, y, w, h) {
  const hNode = figma.createFrame();
  hNode.name = `Prototype Hotspot / ${name}`;
  hNode.resize(w, h);
  hNode.x = x;
  hNode.y = y;
  hNode.fills = paint(C.brand, 0.001);
  hNode.strokes = [];
  createdNodeIds.push(hNode.id);
  return hNode;
}

async function clearPrototypeHelpers(page) {
  for (const node of [...page.children]) {
    if (
      node.name.startsWith("Prototype /") ||
      node.name.startsWith("Flow Label /") ||
      node.name.startsWith("Prototype Hotspot /")
    ) {
      node.remove();
    }
  }
  for (const node of page.findAll((n) => "reactions" in n)) {
    try {
      await node.setReactionsAsync([]);
      mutatedNodeIds.push(node.id);
    } catch {}
  }
}

function screen(page, name) {
  const exact = page.children.find((n) => n.name === `Screen / ${name}`);
  if (exact) return exact;
  const fuzzy = page.children.find((n) => n.name.toLowerCase().includes(name.toLowerCase()));
  if (!fuzzy) warnings.push(`Missing screen: ${name}`);
  return fuzzy || null;
}

function transition() {
  return { type: "SMART_ANIMATE", easing: { type: "EASE_OUT" }, duration: 0.22 };
}

async function setNavigate(source, destination) {
  if (!source || !destination) return;
  await source.setReactionsAsync([{
    trigger: { type: "ON_CLICK" },
    actions: [{
      type: "NODE",
      destinationId: destination.id,
      navigation: "NAVIGATE",
      transition: transition(),
      resetScrollPosition: true
    }]
  }]);
  mutatedNodeIds.push(source.id);
}

async function setOverlay(source, destination) {
  if (!source || !destination) return;
  await source.setReactionsAsync([{
    trigger: { type: "ON_CLICK" },
    actions: [{
      type: "NODE",
      destinationId: destination.id,
      navigation: "OVERLAY",
      transition: {
        type: "MOVE_IN",
        direction: "BOTTOM",
        matchLayers: false,
        duration: 0.22,
        easing: { type: "EASE_OUT" }
      },
      resetScrollPosition: false,
      overlayRelativePosition: { x: 0, y: 0 }
    }]
  }]);
  mutatedNodeIds.push(source.id);
}

function label(page, label, x, y) {
  const l = figma.createFrame();
  l.name = `Flow Label / ${label}`;
  setupAuto(l, "VERTICAL", 4, 10);
  l.x = x;
  l.y = y;
  l.cornerRadius = 16;
  l.fills = paint(C.brandSoft);
  l.strokes = paint(C.brand);
  l.strokeWeight = 1;
  l.appendChild(text(label, 12, true, C.brand));
  page.appendChild(l);
  createdNodeIds.push(l.id);
  return l;
}

function modal(name, title, body, tone = "default") {
  const m = figma.createFrame();
  m.name = `Prototype / ${name}`;
  m.resize(390, 844);
  m.fills = paint(C.scrim, 0.44);
  m.clipsContent = false;
  const sheet = figma.createFrame();
  sheet.name = "Modal Sheet";
  sheet.resize(354, 300);
  sheet.x = 18;
  sheet.y = 496;
  setupAuto(sheet, "VERTICAL", 14, 20);
  sheet.cornerRadius = 28;
  sheet.fills = paint(C.surface);
  sheet.strokes = paint(C.border);
  sheet.strokeWeight = 1;
  sheet.effects = [{
    type: "DROP_SHADOW",
    color: { r: 16 / 255, g: 24 / 255, b: 40 / 255, a: 0.18 },
    offset: { x: 0, y: -18 },
    radius: 46,
    spread: 0,
    visible: true,
    blendMode: "NORMAL"
  }];
  sheet.appendChild(text(title, 22, true, tone === "danger" ? C.danger : C.text));
  sheet.appendChild(text(body, 14, false, C.muted));
  m.appendChild(sheet);
  createdNodeIds.push(m.id, sheet.id);
  return { frame: m, sheet };
}

const page = figma.root.children.find((p) => p.name === "04 Screens - Component Instances");
if (!page) {
  throw new Error("Missing page '04 Screens - Component Instances'. Run Step 4 first.");
}
await figma.setCurrentPageAsync(page);
await clearPrototypeHelpers(page);

const feed = screen(page, "Feed");
const shop = screen(page, "Shop");
const detail = screen(page, "Detail");
const profile = screen(page, "Profile");
const addProduct = screen(page, "Add Product");
const offer = screen(page, "Offer Sheet");
const inbox = screen(page, "Inbox");
const shipment = screen(page, "Wallet / Shipment");

if (feed) {
  warnings.push("Figma Plugin API exposes prototypeStartNode as readonly in this runtime; start node may need to be set manually to Screen / Feed after wiring.");
}

// Create modal/flow helper frames near existing screens.
const loginModal = modal("Guest Login Modal", "เข้าสู่ระบบเพื่อใช้งานคิวสวิฟต์", "เข้าสู่ระบบแล้วระบบจะพากลับไปทำ Xwap ต่อทันที");
loginModal.frame.x = (feed?.x || 80) + 40;
loginModal.frame.y = (feed?.y || 120) + 40;
page.appendChild(loginModal.frame);
const loginButton = button("เข้าสู่ระบบ", "primary");
loginModal.sheet.appendChild(loginButton);

const restrictedModal = modal("Restricted User Modal", "บัญชีนี้ถูกจำกัดสิทธิ์", "บัญชีนี้ดูสินค้าได้ แต่ไม่สามารถส่ง Xwap ได้");
restrictedModal.frame.x = (detail?.x || 80) + 40;
restrictedModal.frame.y = (detail?.y || 120) + 40;
page.appendChild(restrictedModal.frame);
restrictedModal.sheet.appendChild(button("รับทราบ", "danger"));

const searchFilterOverlay = modal("Search Filter Overlay", "ค้นหาและตัวกรอง", "ค้นหาสินค้าหรือเลือกตัวกรอง แล้วไปยังหน้ารายละเอียดสินค้า");
searchFilterOverlay.frame.x = (shop?.x || 80) + 40;
searchFilterOverlay.frame.y = (shop?.y || 120) + 40;
page.appendChild(searchFilterOverlay.frame);
const applyFilter = button("ใช้ตัวกรอง", "primary");
searchFilterOverlay.sheet.appendChild(applyFilter);

const addReview = figma.createFrame();
addReview.name = "Prototype / Add Product Review";
addReview.resize(390, 844);
setupAuto(addReview, "VERTICAL", 16, 18);
addReview.fills = paint(C.page);
addReview.cornerRadius = 32;
addReview.x = (addProduct?.x || 80) + 430;
addReview.y = addProduct?.y || 120;
addReview.appendChild(text("ตรวจสอบก่อนเผยแพร่", 24, true, C.text));
addReview.appendChild(card("รูปสินค้า + รายละเอียด", "Title, category, condition, price, wanted tags"));
const publish = button("เผยแพร่สินค้า", "primary");
addReview.appendChild(publish);
page.appendChild(addReview);
createdNodeIds.push(addReview.id);

const addSuccess = figma.createFrame();
addSuccess.name = "Prototype / Add Product Success";
addSuccess.resize(390, 844);
setupAuto(addSuccess, "VERTICAL", 16, 18);
addSuccess.fills = paint(C.page);
addSuccess.cornerRadius = 32;
addSuccess.x = addReview.x + 430;
addSuccess.y = addReview.y;
addSuccess.appendChild(text("เผยแพร่สำเร็จ", 24, true, C.text));
addSuccess.appendChild(card("สินค้าใหม่พร้อมแสดง", "กลับไปดูใน Feed / Shop / Profile"));
const goFeed = button("กลับไป Feed", "primary");
addSuccess.appendChild(goFeed);
page.appendChild(addSuccess);
createdNodeIds.push(addSuccess.id);

const acceptModal = modal("Accept Offer Modal", "รับข้อเสนอ Xwap", "ยืนยันรับข้อเสนอ แล้วไปจัดการนัดรับ/ขนส่ง");
acceptModal.frame.x = (inbox?.x || 80) + 40;
acceptModal.frame.y = (inbox?.y || 120) + 40;
page.appendChild(acceptModal.frame);
const acceptButton = button("ยืนยันรับข้อเสนอ", "primary");
acceptModal.sheet.appendChild(acceptButton);

// Hotspots on screens.
if (feed && detail) {
  const openDetail = hotspot("Feed card to Detail", 18, 150, 354, 430);
  feed.appendChild(openDetail);
  await setNavigate(openDetail, detail);
  label(page, "Flow 2: Feed -> Detail", feed.x, feed.y - 38);
}

if (feed && loginModal.frame) {
  const guestXwap = hotspot("Guest Xwap requires login", 60, 590, 270, 70);
  feed.appendChild(guestXwap);
  await setOverlay(guestXwap, loginModal.frame);
  label(page, "Flow 1: Guest -> Login -> Xwap", feed.x + 160, feed.y - 38);
}
await setNavigate(loginButton, offer);

if (detail && offer) {
  const detailXwap = hotspot("Detail Xwap to Offer", 90, 610, 210, 68);
  detail.appendChild(detailXwap);
  await setNavigate(detailXwap, offer);
  label(page, "Flow 2: Detail -> Offer Sheet", detail.x, detail.y - 38);
}

if (detail && restrictedModal.frame) {
  const restricted = hotspot("Restricted Xwap modal", 22, 700, 120, 54);
  detail.appendChild(restricted);
  await setOverlay(restricted, restrictedModal.frame);
  label(page, "Flow 6: Restricted modal", detail.x + 170, detail.y - 38);
}

if (shop && searchFilterOverlay.frame) {
  const shopSearch = hotspot("Shop Search Filter", 18, 72, 354, 150);
  shop.appendChild(shopSearch);
  await setOverlay(shopSearch, searchFilterOverlay.frame);
  label(page, "Flow 3: Shop -> Search/Filter -> Detail", shop.x, shop.y - 38);
}
await setNavigate(applyFilter, detail);

if (addProduct) {
  const addNext = hotspot("Add Product Continue", 76, 650, 240, 70);
  addProduct.appendChild(addNext);
  await setNavigate(addNext, addReview);
  label(page, "Flow 4: Add Product", addProduct.x, addProduct.y - 38);
}
await setNavigate(publish, addSuccess);
await setNavigate(goFeed, feed);

if (inbox && acceptModal.frame) {
  const inboxAccept = hotspot("Inbox Accept Offer", 18, 180, 354, 150);
  inbox.appendChild(inboxAccept);
  await setOverlay(inboxAccept, acceptModal.frame);
  label(page, "Flow 5: Inbox -> Accept -> Shipment", inbox.x, inbox.y - 38);
}
await setNavigate(acceptButton, shipment);

// Add flow index panel.
const index = figma.createFrame();
index.name = "Prototype / Flow Index";
index.resize(500, 360);
setupAuto(index, "VERTICAL", 12, 20);
index.x = 80;
index.y = 1980;
index.cornerRadius = 24;
index.fills = paint(C.surface);
index.strokes = paint(C.border);
index.strokeWeight = 1;
index.appendChild(text("Prototype Wiring Index", 24, true, C.text));
[
  "1. Guest -> Login -> Xwap",
  "2. Feed -> Detail -> Offer Sheet",
  "3. Shop -> Search/Filter -> Detail",
  "4. Add Product flow",
  "5. Inbox -> Accept -> Shipment",
  "6. Restricted modal flow"
].forEach((line) => index.appendChild(text(line, 14, false, C.muted)));
page.appendChild(index);
createdNodeIds.push(index.id);

figma.viewport.scrollAndZoomIntoView([feed, shop, detail, addProduct, inbox].filter(Boolean));

return {
  createdNodeIds,
  mutatedNodeIds,
  warnings,
  startNodeId: feed?.id || null,
  flowCount: 6,
  pageName: page.name,
  note: "Wired 6 QXwap prototype flows using hotspots, overlays, and navigation links."
};


})().then(function(result) {
  console.log('[QXwap] Done ✅', JSON.stringify(result, null, 2));
}).catch(function(err) {
  console.error('[QXwap] Error ❌', err);
});
