import { qs, notify, debugStatus } from "../util.js";
import { items, uploads } from "../api.js";
import { authGuard } from "./nav.js";
import { refreshAllData } from "./refresh.js";

function formValue(id, fallback = "") {
  const el = document.getElementById(id);
  return el && "value" in el ? String(el.value || fallback) : fallback;
}

function formChecked(id, fallback = true) {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? Boolean(el.checked) : fallback;
}

function wantedTagsFromForm() {
  const explicit = formValue("itemWantedTags", "");
  const fallback = formValue("itemWanted", "");
  return (explicit || fallback)
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function setDealType(value) {
  const select = document.getElementById("itemDealType");
  if (select && "value" in select) select.value = value;
  document.querySelectorAll("[data-add-deal-type]").forEach((button) => {
    const active = button.getAttribute("data-add-deal-type") === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function ensureAddFormStyles() {
  if (document.getElementById("addFormEnhanceStyles")) return;
  const style = document.createElement("style");
  style.id = "addFormEnhanceStyles";
  style.textContent = `
    .deal-type-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 14px}
    .deal-type-card{border:1px solid var(--line,rgba(0,0,0,.08));background:var(--card,#fff);border-radius:18px;padding:12px 8px;box-shadow:var(--shadow,0 8px 20px rgba(0,0,0,.06));font-weight:900;display:flex;flex-direction:column;gap:6px;align-items:center;justify-content:center;min-height:84px;color:var(--text,#171614)}
    .deal-type-card span{font-size:24px;line-height:1}
    .deal-type-card small{font-size:11px;color:var(--muted,#756d63);font-weight:800;text-align:center}
    .deal-type-card.active{background:var(--brand,#3f6df6);color:#fff;border-color:var(--brand,#3f6df6)}
    .deal-type-card.active small{color:rgba(255,255,255,.86)}
    .add-helper-row{margin:10px 0 14px;padding:12px;border-radius:16px;background:var(--surface,#f0ece6);display:flex;align-items:flex-start;gap:10px;font-size:13px;font-weight:800;color:var(--text,#171614)}
    .add-helper-row input{margin-top:2px}
    .wanted-tags-input{margin-top:8px}
    .visually-soft-hidden{position:absolute!important;opacity:.01;pointer-events:none;width:1px;height:1px;overflow:hidden}
  `;
  document.head.appendChild(style);
}

function ensureInputAfter(anchorId, id, placeholder) {
  if (document.getElementById(id)) return;
  const anchor = document.getElementById(anchorId);
  if (!anchor) return;
  const input = document.createElement("textarea");
  input.id = id;
  input.className = `${anchor.className || "input"} wanted-tags-input`;
  input.placeholder = placeholder;
  input.rows = 2;
  anchor.insertAdjacentElement("afterend", input);
}

function enhanceDealTypeSelector() {
  const select = document.getElementById("itemDealType");
  if (!select || document.getElementById("dealTypeIconCards")) return;
  const cards = document.createElement("div");
  cards.id = "dealTypeIconCards";
  cards.className = "deal-type-cards";
  cards.innerHTML = `
    <button type="button" class="deal-type-card" data-add-deal-type="swap" aria-pressed="false"><span>🔁</span>แลก<small>Xwap กับสินค้าอื่น</small></button>
    <button type="button" class="deal-type-card" data-add-deal-type="buy" aria-pressed="false"><span>💸</span>ขาย<small>รับเงินสด</small></button>
    <button type="button" class="deal-type-card" data-add-deal-type="both" aria-pressed="false"><span>⚡</span>ขาย/แลก<small>เปิดได้ทั้งสองแบบ</small></button>
  `;
  select.insertAdjacentElement("beforebegin", cards);
  select.classList.add("visually-soft-hidden");
  cards.querySelectorAll("[data-add-deal-type]").forEach((button) => {
    button.addEventListener("click", () => setDealType(button.getAttribute("data-add-deal-type") || "swap"));
  });
  setDealType(formValue("itemDealType", "swap"));
}

function ensureOpenToOffersControl() {
  if (document.getElementById("itemOpenToOffers")) return;
  const price = document.getElementById("itemPriceCredit") || document.getElementById("itemPriceCash");
  if (!price) return;
  const label = document.createElement("label");
  label.className = "add-helper-row";
  label.innerHTML = `<input id="itemOpenToOffers" type="checkbox" checked /> <span>เปิดกว้างทุกข้อเสนอ<br><small>ลูกค้าสามารถเสนอเงินสด เครดิต สินค้า หรือข้อความได้ แม้ยังไม่กรอกราคา</small></span>`;
  price.insertAdjacentElement("afterend", label);
}

export function enhanceListingForm() {
  ensureAddFormStyles();
  enhanceDealTypeSelector();
  ensureOpenToOffersControl();
  ensureInputAfter("itemWanted", "itemWantedTags", "เพิ่มสิ่งที่อยากได้เป็นแท็ก เช่น iPhone, กล้อง, เครดิตเพิ่ม");
  const cash = document.getElementById("itemPriceCash");
  if (cash) cash.setAttribute("placeholder", "100 บาท");
  const credit = document.getElementById("itemPriceCredit");
  if (credit) credit.setAttribute("placeholder", "1000 เครดิต");
  const wanted = document.getElementById("itemWanted");
  if (wanted) wanted.setAttribute("placeholder", "สิ่งที่อยากได้หลัก หรือปล่อยว่างถ้าเปิดกว้างทุกข้อเสนอ");
}

export function resetListingForm() {
  ["itemTitle", "itemDescription", "itemWanted", "itemWantedTags", "itemPriceCash", "itemPriceCredit"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && "value" in el) el.value = "";
  });
  const emoji = document.getElementById("itemEmoji");
  if (emoji && "value" in emoji) emoji.value = "📦";
  const location = document.getElementById("itemLocation");
  if (location && "value" in location) location.value = "Bangkok";
  const category = document.getElementById("itemCategory");
  if (category && "value" in category) category.value = "electronics";
  const open = document.getElementById("itemOpenToOffers");
  if (open instanceof HTMLInputElement) open.checked = true;
  setDealType("swap");
  notify("addNotice", "", "");
}

export async function createItem() {
  debugStatus("กำลังบันทึกสินค้า...");
  if (!authGuard()) return;
  enhanceListingForm();
  notify("addNotice", "", "");
  const wantedTags = wantedTagsFromForm();
  const payload = {
    title: formValue("itemTitle").trim(),
    description: formValue("itemDescription").trim(),
    category: formValue("itemCategory", "electronics"),
    conditionLabel: "สภาพดี",
    dealType: formValue("itemDealType", "swap"),
    priceCash: Number(formValue("itemPriceCash", "0") || 0),
    priceCredit: Number(formValue("itemPriceCredit", "0") || 0),
    wantedText: formValue("itemWanted").trim() || wantedTags.join(", "),
    wantedTags,
    openToOffers: formChecked("itemOpenToOffers", true),
    locationLabel: formValue("itemLocation").trim() || "Bangkok",
    imageEmoji: formValue("itemEmoji").trim() || "📦",
  };
  const imageInput = document.getElementById("itemImages");
  const imageFiles = imageInput instanceof HTMLInputElement && imageInput.files ? Array.from(imageInput.files) : [];
  if (!payload.title) return notify("addNotice", "error", "กรอกชื่อสินค้าก่อน");
  if (!payload.category) return notify("addNotice", "error", "เลือกหมวดหมู่ก่อน");
  if (payload.priceCash < 0 || payload.priceCredit < 0) return notify("addNotice", "error", "ราคาติดลบไม่ได้");
  try {
    if (imageFiles.length) {
      notify("addNotice", "ok", "กำลังอัปโหลดรูป...");
      const { urls } = await uploads.images(imageFiles);
      if (Array.isArray(urls) && urls.length) payload.imageUrls = urls;
    }
    await items.create(payload);
    resetListingForm();
    if (imageInput instanceof HTMLInputElement) imageInput.value = "";
    notify("addNotice", "ok", "เพิ่มสินค้าสำเร็จ");
    await refreshAllData({ stayOnScreen: true });
  } catch (e) {
    notify("addNotice", "error", String(e?.message || e));
  }
}
