import { state, categories, distanceOptionsKm } from "../state.js";

function inputValue(id) {
  const el = document.getElementById(id);
  return el && "value" in el ? String(el.value || "") : "";
}

function checked(id) {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? Boolean(el.checked) : false;
}

function ensureFilterStyles() {
  if (document.getElementById("unifiedFilterStyles")) return;
  const style = document.createElement("style");
  style.id = "unifiedFilterStyles";
  style.textContent = `
    .filter-sheet{position:fixed;inset:0;z-index:60;pointer-events:none}
    .filter-sheet.open{pointer-events:auto}
    .filter-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.32);opacity:0;transition:.18s ease}
    .filter-sheet.open .filter-backdrop{opacity:1}
    .filter-panel{position:absolute;left:50%;bottom:0;transform:translateX(-50%) translateY(104%);width:100%;max-width:var(--maxw,430px);max-height:88vh;overflow:auto;background:var(--bg,#f7f5f1);border-radius:28px 28px 0 0;padding:10px 16px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -18px 40px rgba(0,0,0,.18);transition:.24s ease}
    .filter-sheet.open .filter-panel{transform:translateX(-50%) translateY(0)}
    .filter-head{display:flex;align-items:center;justify-content:space-between;margin:4px 0 12px}.filter-head h3{margin:0;font-size:22px;font-weight:900;letter-spacing:-.04em}
    .field-label{display:block;margin:12px 0 6px;font-size:12px;font-weight:900;color:var(--muted,#756d63);letter-spacing:.04em;text-transform:uppercase}
    .input{width:100%;min-height:46px;border:1px solid var(--line,rgba(0,0,0,.08));border-radius:15px;background:var(--card,#fff);padding:0 13px;color:var(--text,#171614);outline:none;box-shadow:0 6px 16px rgba(0,0,0,.04)}
    textarea.input{padding:12px 13px;line-height:1.45;resize:vertical}.filter-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.filter-checks{display:flex;flex-direction:column;gap:8px;margin:14px 0}.filter-checks label{display:flex;align-items:center;gap:10px;background:var(--card,#fff);border-radius:15px;padding:11px 12px;font-size:13px;font-weight:800;box-shadow:0 6px 16px rgba(0,0,0,.04)}
    .wanted-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.wanted-tag{border:none;border-radius:999px;background:var(--brand-soft,rgba(63,109,246,.12));color:var(--brand,#3f6df6);padding:7px 10px;font-size:12px;font-weight:900;cursor:pointer}.wanted-tag:active{transform:scale(.97)}
  `;
  document.head.appendChild(style);
}

export function syncSearchInputsFromFilters() {
  const query = state.filters.query || "";
  ["feedSearch", "shopSearch"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && "value" in el && el.value !== query) el.value = query;
  });
}

export function syncFiltersFromSearch(sourceId) {
  const value = inputValue(sourceId).trim();
  state.filters.query = value;
  syncSearchInputsFromFilters();
}

export function buildItemQueryParams(context = "shop") {
  const filters = state.filters || {};
  const params = { search: filters.query || "" };
  const deal = filters.dealType && filters.dealType !== "all" ? filters.dealType : context === "feed" ? "feed" : "";
  if (deal) params.deal_type = deal;
  if (filters.category && filters.category !== "all") params.category = filters.category;
  if (String(filters.priceMin || "").trim() !== "") params.price_min = String(filters.priceMin).trim();
  if (String(filters.priceMax || "").trim() !== "") params.price_max = String(filters.priceMax).trim();
  if (filters.openToOffers) params.open_to_offers = "1";
  if (filters.wantedTag) params.wanted_tag = filters.wantedTag;
  if (filters.followingOnly) params.following_only = "1";
  if (filters.nearbyKm) params.radius_km = String(filters.nearbyKm);
  if (filters.fastResponder) params.fast_responder = "1";
  if (filters.topUser) params.top_user = "1";
  if (filters.hasRequests) params.has_requests = "1";
  return params;
}

export function applyWantedTagFilter(tag) {
  state.filters.query = tag;
  state.filters.wantedTag = tag;
  syncSearchInputsFromFilters();
}

export function ensureFilterSheet() {
  ensureFilterStyles();
  let sheet = document.getElementById("unifiedFilterSheet");
  if (sheet) return sheet;
  sheet = document.createElement("div");
  sheet.id = "unifiedFilterSheet";
  sheet.className = "filter-sheet";
  sheet.innerHTML = `
    <div class="filter-backdrop" data-filter-close="1"></div>
    <section class="filter-panel" role="dialog" aria-modal="true" aria-label="ตัวกรองสินค้า">
      <div class="sheet-handle"></div>
      <div class="filter-head"><h3>ตัวกรอง</h3><button type="button" class="ghost-icon" data-filter-close="1">×</button></div>
      <label class="field-label">ค้นหา</label>
      <input id="filterQuery" class="input" placeholder="ค้นหาสินค้า / สิ่งที่อยากได้" />
      <div class="filter-grid-2">
        <div><label class="field-label">ราคาต่ำสุด</label><input id="filterPriceMin" class="input" inputmode="numeric" placeholder="0" /></div>
        <div><label class="field-label">ราคาสูงสุด</label><input id="filterPriceMax" class="input" inputmode="numeric" placeholder="5000" /></div>
      </div>
      <label class="field-label">ระยะใกล้เคียง</label>
      <select id="filterNearbyKm" class="input"><option value="">ไม่จำกัด</option>${distanceOptionsKm.map((km) => `<option value="${km}">${km} กม.</option>`).join("")}</select>
      <label class="field-label">หมวดหมู่สินค้า</label>
      <select id="filterCategory" class="input">${categories.map((cat) => `<option value="${cat.key}">${cat.icon} ${cat.name}</option>`).join("")}</select>
      <label class="field-label">ประเภทดีล</label>
      <select id="filterDealType" class="input"><option value="all">ทั้งหมด</option><option value="swap">แลก</option><option value="buy">ขาย</option><option value="both">ขายหรือแลก</option></select>
      <div class="filter-checks">
        <label><input type="checkbox" id="filterOpenToOffers" /> เปิดกว้างทุกข้อเสนอ</label>
        <label><input type="checkbox" id="filterFollowingOnly" /> คนที่กำลัง follow</label>
        <label><input type="checkbox" id="filterFastResponder" /> ตอบไว</label>
        <label><input type="checkbox" id="filterTopUser" /> ผู้ใช้งานดีเด่น</label>
        <label><input type="checkbox" id="filterHasRequests" /> มีคนรอแลก / มีข้อเสนอ</label>
      </div>
      <div class="btn-row"><button type="button" class="soft-btn" data-filter-reset="1">รีเซ็ต</button><button type="button" class="primary-btn" data-filter-apply="1">ใช้ตัวกรอง</button></div>
      <p class="sub">ตัวกรองใกล้เคียง/ตอบไว/ผู้ใช้งานดีเด่นจะส่งค่าไป API เมื่อ backend รองรับ และไม่ทำให้ search เดิมพัง</p>
    </section>
  `;
  document.body.appendChild(sheet);
  sheet.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-filter-close]")) closeFilterSheet();
    if (target.closest("[data-filter-reset]")) {
      resetUnifiedFilters();
      populateFilterForm();
    }
    if (target.closest("[data-filter-apply]")) {
      readFilterForm();
      closeFilterSheet();
      const { loadFeed } = await import("./feed.js");
      const { loadShop } = await import("./shop.js");
      await Promise.allSettled([loadFeed(), loadShop()]);
    }
  });
  return sheet;
}

function populateFilterForm() {
  const f = state.filters;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && "value" in el) el.value = val || "";
  };
  const setChecked = (id, val) => {
    const el = document.getElementById(id);
    if (el instanceof HTMLInputElement) el.checked = Boolean(val);
  };
  setVal("filterQuery", f.query);
  setVal("filterPriceMin", f.priceMin);
  setVal("filterPriceMax", f.priceMax);
  setVal("filterNearbyKm", f.nearbyKm);
  setVal("filterCategory", f.category || "all");
  setVal("filterDealType", f.dealType || "all");
  setChecked("filterOpenToOffers", f.openToOffers);
  setChecked("filterFollowingOnly", f.followingOnly);
  setChecked("filterFastResponder", f.fastResponder);
  setChecked("filterTopUser", f.topUser);
  setChecked("filterHasRequests", f.hasRequests);
}

function readFilterForm() {
  state.filters.query = inputValue("filterQuery").trim();
  state.filters.priceMin = inputValue("filterPriceMin").trim();
  state.filters.priceMax = inputValue("filterPriceMax").trim();
  state.filters.nearbyKm = inputValue("filterNearbyKm");
  state.filters.category = inputValue("filterCategory") || "all";
  state.filters.dealType = inputValue("filterDealType") || "all";
  state.filters.openToOffers = checked("filterOpenToOffers");
  state.filters.followingOnly = checked("filterFollowingOnly");
  state.filters.fastResponder = checked("filterFastResponder");
  state.filters.topUser = checked("filterTopUser");
  state.filters.hasRequests = checked("filterHasRequests");
  syncSearchInputsFromFilters();
}

export function openFilterSheet() {
  const sheet = ensureFilterSheet();
  populateFilterForm();
  sheet.classList.add("open");
  document.body.classList.add("modal-open");
}

export function closeFilterSheet() {
  const sheet = document.getElementById("unifiedFilterSheet");
  if (sheet) sheet.classList.remove("open");
  document.body.classList.remove("modal-open");
}

export function resetUnifiedFilters() {
  state.filters = {
    query: "",
    priceMin: "",
    priceMax: "",
    followingOnly: false,
    nearbyKm: "",
    fastResponder: false,
    topUser: false,
    hasRequests: false,
    category: "all",
    dealType: "all",
    openToOffers: false,
    wantedTag: "",
  };
  syncSearchInputsFromFilters();
}
