import { qs, escapeHtml, notify, debugStatus } from "../util.js";
import { state, categories } from "../state.js";
import { items, offers } from "../api.js";
import { authGuard } from "./nav.js";

function itemEmoji(item) {
  return (
    item?.imageEmoji ||
    (item?.category === "phone"
      ? "📱"
      : item?.category === "fashion"
        ? "👕"
        : item?.category === "home"
          ? "🏠"
          : "📦")
  );
}

export function renderCategories() {
  qs("categoryRow").innerHTML = categories
    .map(
      (cat) => `
    <div class="category-card ${state.currentCategory === cat.key ? "active" : ""}" onclick="window.QX.setCategory('${cat.key}')">
      <div class="category-icon">${cat.icon}</div>
      <div class="category-name">${cat.name}</div>
    </div>`,
    )
    .join("");
}

export function setCategory(key) {
  state.currentCategory = key;
  renderCategories();
  loadShop();
}

export function setShopFilter(filter, btn) {
  state.shopFilter = filter;
  document
    .querySelectorAll("[data-shop-filter]")
    .forEach((x) => x.classList.remove("active"));
  btn.classList.add("active");
  loadShop();
}

export function setFeedFilter(filter, btn) {
  state.feedFilter = filter;
  document
    .querySelectorAll("[data-feed-filter]")
    .forEach((x) => x.classList.remove("active"));
  btn.classList.add("active");
  loadFeed();
}

export function resetListingForm() {
  [
    "itemTitle",
    "itemDescription",
    "itemWanted",
    "itemPriceCash",
    "itemPriceCredit",
  ].forEach((id) => (qs(id).value = ""));
  qs("itemEmoji").value = "📦";
  qs("itemLocation").value = "Bangkok";
  qs("itemDealType").value = "swap";
  qs("itemCategory").value = "electronics";
  notify("addNotice", "", "");
}

export async function createItem() {
  debugStatus("กำลังบันทึกสินค้า...");
  if (!authGuard()) return;
  notify("addNotice", "", "");
  const payload = {
    title: qs("itemTitle").value.trim(),
    description: qs("itemDescription").value.trim(),
    category: qs("itemCategory").value,
    conditionLabel: "สภาพดี",
    dealType: qs("itemDealType").value,
    priceCash: Number(qs("itemPriceCash").value || 0),
    priceCredit: Number(qs("itemPriceCredit").value || 0),
    wantedText: qs("itemWanted").value.trim(),
    locationLabel: qs("itemLocation").value.trim() || "Bangkok",
    imageEmoji: qs("itemEmoji").value.trim() || "📦",
  };
  if (!payload.title) return notify("addNotice", "error", "กรอกชื่อสินค้าก่อน");
  if (!payload.category)
    return notify("addNotice", "error", "เลือกหมวดหมู่ก่อน");
  if (payload.priceCash < 0 || payload.priceCredit < 0)
    return notify("addNotice", "error", "ราคาติดลบไม่ได้");
  try {
    await items.create(payload);
    resetListingForm();
    notify("addNotice", "ok", "เพิ่มสินค้าสำเร็จ");
    loadShop();
    loadFeed();
    const { loadProfile } = await import("./profile.js");
    loadProfile();
  } catch (e) {
    notify("addNotice", "error", String(e?.message || e));
  }
}

export function productCardHtml(item) {
  const buyBtn =
    item.dealType === "swap"
      ? ""
      : `<button class="btn soft" data-buy-now="1">ซื้อเลย</button>`;
  const priceLabel =
    item.dealType === "swap"
      ? "เปิดรับ Xwap"
      : `฿${Number(item.priceCash || 0).toLocaleString()}`;
  return `
    <div class="product-card" data-item-id="${escapeHtml(item.id)}" data-item-title="${escapeHtml(item.title || "")}" data-owner-id="${escapeHtml(item.ownerId)}">
      <div class="image-box">
        <div class="badge">${escapeHtml(item.conditionLabel || "สภาพดี")}</div>
        <div class="badge right">${item.dealType === "swap" ? "แลกได้" : item.dealType === "both" ? "ขาย/แลก" : "ซื้อได้"}</div>
        ${escapeHtml(itemEmoji(item))}
      </div>
      <div class="product-title">${escapeHtml(item.title || "-")}</div>
      <div class="price">${escapeHtml(priceLabel)}</div>
      <div class="product-meta">${escapeHtml(item.locationLabel || "Bangkok")} · ${escapeHtml(item.category || "")}</div>
      <div class="btn-row">${buyBtn}<button class="btn primary" data-xwap="1">Xwap</button></div>
    </div>`;
}

export function feedCardHtml(item) {
  return `
    <div class="feed-card" data-item-id="${escapeHtml(item.id)}" data-item-title="${escapeHtml(item.title || "")}" data-owner-id="${escapeHtml(item.ownerId)}">
      <div class="swap-panels">
        <div class="swap-panel">
          <div class="swap-label">มีอยู่</div>
          <div class="swap-image">${escapeHtml(itemEmoji(item))}</div>
        </div>
        <div class="swap-panel">
          <div class="swap-label right">อยากได้</div>
          <div class="want-box"><div style="font-size:15px;font-weight:800;line-height:1.4">${escapeHtml(item.wantedText || "ยังไม่ได้ระบุ")}</div></div>
        </div>
      </div>
      <div class="swap-card-title">${escapeHtml(item.title || "-")}</div>
      <div class="swap-card-sub">${escapeHtml(item.locationLabel || "Bangkok")} · ${escapeHtml(item.category || "")}</div>
      <div class="btn-row" style="margin-top:12px"><button class="btn primary" data-xwap="1">Xwap</button></div>
    </div>`;
}

export function bindCardActions(container) {
  container.querySelectorAll("[data-xwap]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-item-id]");
      if (!card) return;
      openOfferPrompt(
        card.getAttribute("data-item-id"),
        card.getAttribute("data-item-title") || "สินค้า",
        card.getAttribute("data-owner-id"),
      );
    });
  });
  container.querySelectorAll("[data-buy-now]").forEach((btn) => {
    btn.addEventListener("click", () =>
      alert("เวอร์ชันนี้ยังไม่ได้ต่อ Buy flow"),
    );
  });
}

export async function loadShop() {
  if (!authGuard()) return;
  notify("shopNotice", "", "");
  const search = qs("shopSearch").value.trim();
  const params = { search };
  if (state.shopFilter === "swap") params.deal_type = "swap";
  if (state.shopFilter === "buy") params.deal_type = "buy";
  if (state.currentCategory !== "all") params.category = state.currentCategory;
  try {
    const { items: list } = await items.list(params);
    const grid = qs("shopGrid");
    grid.innerHTML = list.length
      ? list.map(productCardHtml).join("")
      : `<div class="empty" style="grid-column:1/-1">ยังไม่มีสินค้า</div>`;
    bindCardActions(grid);
  } catch (e) {
    notify("shopNotice", "error", String(e?.message || e));
  }
}

export async function loadFeed() {
  if (!authGuard()) return;
  notify("feedNotice", "", "");
  const search = qs("feedSearch").value.trim();
  const params = { search };
  if (state.feedFilter === "swap") params.deal_type = "swap";
  if (state.feedFilter === "both") params.deal_type = "both";
  if (state.feedFilter === "all") params.deal_type = "feed";
  try {
    let { items: list } = await items.list(params);
    list = list.filter((i) => i.dealType !== "buy");
    const feed = qs("feedList");
    feed.innerHTML = list.length
      ? list.map(feedCardHtml).join("")
      : `<div class="empty">ยังไม่มีสินค้าในฟีด</div>`;
    bindCardActions(feed);
  } catch (e) {
    notify("feedNotice", "error", String(e?.message || e));
  }
}

export async function openOfferPrompt(itemId, itemTitle, ownerId) {
  if (!authGuard()) return;
  if (ownerId === state.currentUser.id)
    return alert("ไม่สามารถขอแลกสินค้าของตัวเอง");
  const message = prompt(
    `ต้องการส่งข้อความขอแลกสำหรับ ${itemTitle} ?`,
    "สนใจแลกครับ",
  );
  if (message === null) return;
  try {
    await offers.create({
      targetItemId: itemId,
      receiverId: ownerId,
      offeredCash: 0,
      offeredCredit: 0,
      message: message || "",
    });
    alert("ส่งข้อเสนอแล้ว");
    const { loadInbox } = await import("./offers.js");
    loadInbox();
  } catch (e) {
    alert("ส่งข้อเสนอไม่สำเร็จ: " + String(e?.message || e));
  }
}
