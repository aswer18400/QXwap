import { escapeHtml, itemEmoji } from "../util.js";
import { state } from "../state.js";
import { offers, bookmarks, items } from "../api.js";
import { authGuard } from "./nav.js";
import { refreshAllData } from "./refresh.js";
import { applyWantedTagFilter } from "./filters.js";

const FEED_DETAIL_MODAL_ID = "feedDetailModal";
const savedItemIds = new Set();
let savedLoadedForUserId = null;
let loadingSavedPromise = null;
const detailItemCache = new Map();

export function clearSavedCache() {
  savedItemIds.clear();
  savedLoadedForUserId = null;
  loadingSavedPromise = null;
}

export async function loadSavedListings() {
  if (!state.currentUser?.id) {
    clearSavedCache();
    return [];
  }
  const userId = state.currentUser.id;
  if (savedLoadedForUserId === userId && loadingSavedPromise == null) return [...savedItemIds];
  if (!loadingSavedPromise) {
    loadingSavedPromise = bookmarks
      .list()
      .then(({ itemIds }) => {
        savedItemIds.clear();
        for (const id of Array.isArray(itemIds) ? itemIds : []) {
          if (typeof id === "string" && id.trim()) savedItemIds.add(id);
        }
        savedLoadedForUserId = userId;
        return [...savedItemIds];
      })
      .finally(() => {
        loadingSavedPromise = null;
      });
  }
  return loadingSavedPromise;
}

function isSaved(itemId) {
  return savedItemIds.has(itemId);
}

async function toggleSaved(itemId) {
  if (!authGuard()) return null;
  if (!savedLoadedForUserId) await loadSavedListings();
  if (savedItemIds.has(itemId)) {
    await bookmarks.unsave(itemId);
    savedItemIds.delete(itemId);
    return false;
  }
  await bookmarks.save(itemId);
  savedItemIds.add(itemId);
  return true;
}

function formatPrice(item) {
  const cash = Number(item.priceCash || 0);
  const credit = Number(item.priceCredit || 0);
  if (item.openToOffers && !cash && !credit) return "เปิดกว้างทุกข้อเสนอ";
  if (item.dealType === "swap" && !cash && !credit) return "เปิดรับ Xwap";
  if (cash && credit) return `฿${cash.toLocaleString()} + ${credit.toLocaleString()} เครดิต`;
  if (cash) return `฿${cash.toLocaleString()}`;
  if (credit) return `${credit.toLocaleString()} เครดิต`;
  return "เปิดรับข้อเสนอ";
}

function dealTypeLabel(dealType) {
  if (dealType === "both") return "ขาย/แลก";
  if (dealType === "buy") return "ซื้อได้";
  return "แลกได้";
}

function parseImageList(item) {
  const candidates = [
    item?.imageUrls,
    item?.images,
    item?.media,
    item?.photos,
    item?.image_urls,
    item?.image_url,
    item?.imageUrl,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) {
      if (value.includes(",")) return value.split(",").map((x) => x.trim()).filter(Boolean);
      return [value];
    }
  }
  return [];
}

function pickImage(item, side = "have") {
  const images = parseImageList(item);
  if (images.length === 0) return null;
  if (side === "want" && images[1]) return images[1];
  return images[0];
}

function wantedTags(item) {
  if (Array.isArray(item?.wantedTags)) return item.wantedTags.map(String).map((x) => x.trim()).filter(Boolean);
  if (Array.isArray(item?.wanted_tags)) return item.wanted_tags.map(String).map((x) => x.trim()).filter(Boolean);
  return String(item?.wantedText || "").split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
}

function wantedTagsHtml(item) {
  const tags = wantedTags(item);
  if (!tags.length) return "";
  return `<div class="wanted-tags">${tags.map((tag) => `<button type="button" class="wanted-tag" data-wanted-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join("")}</div>`;
}

function requestPreviewRow(item) {
  const requests = Array.isArray(item.requestPreview) ? item.requestPreview : [];
  if (!requests.length) {
    return `<div class="feed-request-preview"><div class="feed-request-avatars"><span class="feed-request-avatar fallback">•</span></div><div class="feed-request-text">ยังไม่มีคำขอแลก · พร้อมรับข้อเสนอแรก</div></div>`;
  }
  const avatars = requests.slice(0, 3).map((entry, idx) => {
    const initial = escapeHtml(String(entry?.name || `U${idx + 1}`).trim().slice(0, 1).toUpperCase());
    if (entry?.avatar) return `<span class="feed-request-avatar"><img src="${escapeHtml(entry.avatar)}" alt="${initial}" loading="lazy" /></span>`;
    return `<span class="feed-request-avatar">${initial}</span>`;
  }).join("");
  const total = Number(item.requestCount || requests.length || 0);
  return `<div class="feed-request-preview"><div class="feed-request-avatars">${avatars}</div><div class="feed-request-text">${total.toLocaleString()} คำขอสนใจรายการนี้</div></div>`;
}

export function productCardHtml(item) {
  detailItemCache.set(item.id, item);
  const buyBtn = item.dealType === "swap" ? "" : `<button class="btn soft" data-buy-now="1">ซื้อเลย</button>`;
  const priceLabel = item.dealType === "swap" ? "เปิดรับ Xwap" : formatPrice(item);
  const image = pickImage(item);
  const emoji = escapeHtml(itemEmoji(item));
  return `
    <div class="product-card" data-item-id="${escapeHtml(item.id)}" data-item-title="${escapeHtml(item.title || "")}" data-owner-id="${escapeHtml(item.ownerId || "")}">
      <div class="product-left">
        <div class="product-badge">${escapeHtml(item.conditionLabel || "สภาพดี")}</div>
        <div class="product-image">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title || "สินค้า")}" loading="lazy" />` : emoji}</div>
      </div>
      <div class="product-right">
        <div class="product-top-row"><div class="product-title">${escapeHtml(item.title || "-")}</div><div class="deal-chip">${escapeHtml(dealTypeLabel(item.dealType))}</div></div>
        <div class="price">${escapeHtml(priceLabel)}</div>
        <div class="product-meta">${escapeHtml(item.locationLabel || "Bangkok")} · ${escapeHtml(item.category || "")}</div>
        ${wantedTagsHtml(item)}
        <div class="btn-row">${buyBtn}<button class="btn primary" data-xwap="1">Xwap</button><button class="btn ghost" data-open-detail="1">ดูรายละเอียด</button></div>
      </div>
    </div>`;
}

export function feedCardHtml(item) {
  detailItemCache.set(item.id, item);
  const saved = isSaved(item.id);
  const haveImg = pickImage(item, "have");
  const wantImg = pickImage(item, "want");
  const haveEmoji = escapeHtml(itemEmoji(item));
  const tags = wantedTags(item);
  const wantedText = escapeHtml(tags.join(", ") || item.wantedText || "ยังไม่ได้ระบุสิ่งที่อยากได้");
  const cardTitle = escapeHtml(item.title || "รายการสำหรับ Xwap");
  const location = escapeHtml(item.locationLabel || "Bangkok");
  const category = escapeHtml(item.category || "อื่นๆ");
  const deal = dealTypeLabel(item.dealType);
  const price = escapeHtml(formatPrice(item));
  const requestSummary = escapeHtml(item.requestSummary || wantedText);

  return `
    <article class="feed-card ${saved ? "saved" : ""}" data-feed-card="1" data-item-id="${escapeHtml(item.id)}" data-item-title="${escapeHtml(item.title || "")}" data-owner-id="${escapeHtml(item.ownerId || "")}" data-item-location="${location}" data-item-category="${category}" data-item-deal="${escapeHtml(deal)}" data-item-price="${price}" data-item-wanted="${wantedText}" data-item-emoji="${haveEmoji}">
      <button class="feed-save-btn ${saved ? "saved" : ""}" data-save="1" aria-label="${saved ? "ยกเลิกบันทึก" : "บันทึกรายการ"}" aria-pressed="${saved ? "true" : "false"}"><span class="feed-save-icon">${saved ? "★" : "☆"}</span></button>
      <div class="swap-hero">
        <div class="swap-half own"><div class="swap-label">มีอยู่</div><div class="swap-media">${haveImg ? `<img src="${escapeHtml(haveImg)}" alt="${cardTitle}" loading="lazy" />` : `<div class="swap-media-fallback">${haveEmoji}</div>`}</div></div>
        <div class="swap-half want"><div class="swap-label right">อยากได้</div><div class="swap-media">${wantImg ? `<img src="${escapeHtml(wantImg)}" alt="${wantedText}" loading="lazy" />` : `<div class="swap-media-wanted">${wantedText}</div>`}</div></div>
        <button class="feed-xwap-cta" data-xwap="1" aria-label="ส่งคำขอ Xwap">Xwap</button>
      </div>
      <div class="feed-card-body">
        <div class="swap-card-title">${cardTitle}</div>
        <div class="swap-card-sub">${location} · ${category} · ${escapeHtml(deal)}</div>
        <div class="feed-meta-row"><div class="feed-price">${price}</div><div class="feed-request-summary">${requestSummary}</div></div>
        ${wantedTagsHtml(item)}
        ${requestPreviewRow(item)}
        <div class="feed-actions"><button class="btn primary" data-xwap="1">ส่งคำขอ Xwap</button><button class="btn ghost" data-open-detail="1">ดูรายละเอียด</button></div>
      </div>
    </article>`;
}

export function bindCardActions(container) {
  if (container.dataset.cardActionsBound === "1") return;
  container.dataset.cardActionsBound = "1";

  let touchStartX = 0;
  let touchStartY = 0;
  let swipeCard = null;

  container.addEventListener("touchstart", (event) => {
    const card = event.target.closest("[data-feed-card]");
    if (!card || event.target.closest("[data-xwap],[data-save],[data-open-detail]")) return;
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    swipeCard = card;
  }, { passive: true });

  container.addEventListener("touchend", (event) => {
    if (!swipeCard) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) > 68 && Math.abs(dy) < 44) {
      const cls = dx > 0 ? "swiped-right" : "swiped-left";
      swipeCard.classList.add(cls);
      window.setTimeout(() => swipeCard?.classList.remove(cls), 320);
    }
    swipeCard = null;
  }, { passive: true });

  container.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tagBtn = target.closest("[data-wanted-tag]");
    if (tagBtn) {
      const tag = tagBtn.getAttribute("data-wanted-tag") || "";
      applyWantedTagFilter(tag);
      const { loadFeed } = await import("./feed.js");
      const { loadShop } = await import("./shop.js");
      await Promise.allSettled([loadFeed(), loadShop()]);
      return;
    }

    const buyBtn = target.closest("[data-buy-now]");
    if (buyBtn) {
      alert("เวอร์ชันนี้ยังไม่ได้ต่อ Buy flow");
      return;
    }

    const saveBtn = target.closest("[data-save]");
    if (saveBtn) {
      if (!authGuard()) return;
      const card = saveBtn.closest("[data-item-id]");
      if (!card) return;
      const itemId = card.getAttribute("data-item-id");
      if (!itemId) return;
      const prevDisabled = saveBtn.getAttribute("disabled");
      saveBtn.setAttribute("disabled", "disabled");
      try {
        const saved = await toggleSaved(itemId);
        if (saved == null) return;
        saveBtn.classList.toggle("saved", saved);
        saveBtn.setAttribute("aria-pressed", saved ? "true" : "false");
        saveBtn.setAttribute("aria-label", saved ? "ยกเลิกบันทึก" : "บันทึกรายการ");
        const icon = saveBtn.querySelector(".feed-save-icon");
        if (icon) icon.textContent = saved ? "★" : "☆";
        const feedCard = saveBtn.closest(".feed-card");
        if (feedCard) {
          feedCard.classList.toggle("saved", saved);
          feedCard.classList.add("save-bump");
          window.setTimeout(() => feedCard.classList.remove("save-bump"), 240);
        }
      } catch (error) {
        alert("บันทึกรายการไม่สำเร็จ: " + String(error?.message || error));
      } finally {
        if (prevDisabled == null) saveBtn.removeAttribute("disabled");
        else saveBtn.setAttribute("disabled", prevDisabled);
      }
      return;
    }

    const xwapBtn = target.closest("[data-xwap]");
    if (xwapBtn) {
      const card = xwapBtn.closest("[data-item-id]");
      if (!card) return;
      card.classList.add("xwap-active");
      window.setTimeout(() => card.classList.remove("xwap-active"), 900);
      await openOfferPrompt(card.getAttribute("data-item-id"), card.getAttribute("data-item-title") || "สินค้า", card.getAttribute("data-owner-id"));
      return;
    }

    const detailBtn = target.closest("[data-open-detail]");
    if (detailBtn) {
      const card = detailBtn.closest("[data-item-id]");
      if (!card) return;
      await openDetailByItemId(card.getAttribute("data-item-id"), card);
      return;
    }

    const card = target.closest("[data-feed-card], .product-card");
    if (card) await openDetailByItemId(card.getAttribute("data-item-id"), card);
  });
}

export async function openOfferPrompt(itemId, itemTitle, ownerId) {
  if (!authGuard()) return;
  if (ownerId === state.currentUser.id) return alert("ไม่สามารถขอแลกสินค้าของตัวเอง");
  const message = prompt(`ข้อความถึงเจ้าของสินค้า (${itemTitle})`, "สนใจแลกครับ");
  if (message === null) return;
  const cashInput = prompt("เพิ่มเงินสด (ปล่อยว่างได้)", "");
  if (cashInput === null) return;
  const creditInput = prompt("เพิ่มเครดิต (ปล่อยว่างได้)", "");
  if (creditInput === null) return;
  const cashAmount = Math.max(0, Number(cashInput || 0) || 0);
  const creditAmount = Math.max(0, Number(creditInput || 0) || 0);
  const item = {};
  if (cashAmount > 0) item.cashAmount = cashAmount;
  if (creditAmount > 0) item.creditAmount = creditAmount;
  const itemList = Object.keys(item).length ? [item] : [];
  if (!String(message || "").trim() && itemList.length === 0) return alert("เพิ่มข้อความ เงินสด หรือเครดิตก่อนส่งข้อเสนอ");
  try {
    await offers.create({ targetItemId: itemId, message: String(message || "").trim(), items: itemList });
    alert("ส่งข้อเสนอแล้ว");
    await refreshAllData({ stayOnScreen: true });
  } catch (e) {
    alert("ส่งข้อเสนอไม่สำเร็จ: " + String(e?.message || e));
  }
}

function ensureFeedDetailModal() {
  let modal = document.getElementById(FEED_DETAIL_MODAL_ID);
  if (modal) return modal;
  modal = document.createElement("div");
  modal.id = FEED_DETAIL_MODAL_ID;
  modal.className = "feed-detail-modal";
  modal.innerHTML = `<div class="feed-detail-backdrop" data-close-feed-detail="1"></div><div class="feed-detail-sheet" role="dialog" aria-modal="true" aria-label="รายละเอียดสินค้า"><button class="feed-detail-close" data-close-feed-detail="1" aria-label="ปิด">×</button><div class="feed-detail-content"></div></div>`;
  document.body.appendChild(modal);
  modal.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-close-feed-detail]")) closeFeedDetail();
    const xwap = target.closest("[data-feed-detail-xwap]");
    if (xwap) {
      closeFeedDetail();
      await openOfferPrompt(xwap.getAttribute("data-item-id"), xwap.getAttribute("data-item-title") || "สินค้า", xwap.getAttribute("data-owner-id"));
    }
    const del = target.closest("[data-feed-delete]");
    if (del) {
      const itemId = del.getAttribute("data-item-id");
      if (itemId && confirm("ลบสินค้านี้?")) {
        await items.remove(itemId);
        closeFeedDetail();
        await refreshAllData({ stayOnScreen: true });
      }
    }
  });
  return modal;
}

async function resolveItem(itemId, card) {
  if (itemId && detailItemCache.has(itemId)) return detailItemCache.get(itemId);
  if (itemId) {
    const response = await items.get(itemId);
    if (response?.item) {
      detailItemCache.set(itemId, response.item);
      return response.item;
    }
  }
  return {
    id: itemId,
    title: card?.getAttribute("data-item-title") || "รายการสำหรับ Xwap",
    wantedText: card?.getAttribute("data-item-wanted") || "ยังไม่ได้ระบุ",
    locationLabel: card?.getAttribute("data-item-location") || "Bangkok",
    category: card?.getAttribute("data-item-category") || "-",
    dealType: card?.getAttribute("data-item-deal") || "swap",
    ownerId: card?.getAttribute("data-owner-id") || "",
    imageEmoji: card?.getAttribute("data-item-emoji") || "📦",
  };
}

export async function openDetailByItemId(itemId, card = null) {
  const modal = ensureFeedDetailModal();
  const content = modal.querySelector(".feed-detail-content");
  if (!content) return;
  content.innerHTML = `<div class="empty">กำลังโหลดรายละเอียด...</div>`;
  modal.classList.add("open");
  document.body.classList.add("modal-open");
  try {
    const item = await resolveItem(itemId, card);
    const image = pickImage(item);
    const title = item.title || "รายการสำหรับ Xwap";
    const isOwner = Boolean(state.currentUser?.id && item.ownerId === state.currentUser.id);
    content.innerHTML = `
      <div class="feed-detail-emoji">${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" />` : escapeHtml(itemEmoji(item))}</div>
      <h3>${escapeHtml(title)}</h3>
      <p class="feed-detail-meta">${escapeHtml(item.locationLabel || "Bangkok")} · ${escapeHtml(item.category || "-")} · ${escapeHtml(dealTypeLabel(item.dealType))}</p>
      <div class="feed-detail-price">${escapeHtml(formatPrice(item))}</div>
      <div class="feed-detail-wanted"><strong>อยากได้:</strong> ${escapeHtml(wantedTags(item).join(", ") || item.wantedText || "ยังไม่ได้ระบุ")}</div>
      ${wantedTagsHtml(item)}
      <div class="feed-detail-actions">${isOwner ? `<button class="btn soft" data-feed-edit="1">แก้ไข</button><button class="btn ghost" data-feed-delete="1" data-item-id="${escapeHtml(item.id)}">ลบ</button>` : `<button class="btn primary" data-feed-detail-xwap="1" data-item-id="${escapeHtml(item.id)}" data-item-title="${escapeHtml(title)}" data-owner-id="${escapeHtml(item.ownerId || "")}">ส่งคำขอ Xwap</button>`}</div>
    `;
  } catch (e) {
    content.innerHTML = `<div class="empty">โหลดรายละเอียดไม่สำเร็จ: ${escapeHtml(String(e?.message || e))}</div>`;
  }
}

function closeFeedDetail() {
  const modal = document.getElementById(FEED_DETAIL_MODAL_ID);
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("modal-open");
}
