import { escapeHtml, itemEmoji } from "../util.js";
import { state } from "../state.js";
import { offers } from "../api.js";
import { authGuard } from "./nav.js";

const SAVED_ITEMS_KEY = "qxwap.saved-items";
const FEED_DETAIL_MODAL_ID = "feedDetailModal";

function readSavedItems() {
  try {
    const raw = window.localStorage.getItem(SAVED_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeSavedItems(savedSet) {
  window.localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify([...savedSet]));
}

function isSaved(itemId) {
  return readSavedItems().has(itemId);
}

function toggleSaved(itemId) {
  const saved = readSavedItems();
  if (saved.has(itemId)) {
    saved.delete(itemId);
    writeSavedItems(saved);
    return false;
  }
  saved.add(itemId);
  writeSavedItems(saved);
  return true;
}

function formatPrice(item) {
  const cash = Number(item.priceCash || 0);
  const credit = Number(item.priceCredit || 0);
  if (item.dealType === "swap" && !cash && !credit) return "เปิดรับ Xwap";
  if (cash && credit) {
    return `฿${cash.toLocaleString()} + ${credit.toLocaleString()} เครดิต`;
  }
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
    item?.image_url,
    item?.imageUrl,
  ];
  for (const value of candidates) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) {
      if (value.includes(",")) {
        return value
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      }
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

function requestPreviewRow(item) {
  const requests = Array.isArray(item.requestPreview) ? item.requestPreview : [];
  if (!requests.length) {
    return `
      <div class="feed-request-preview">
        <div class="feed-request-avatars">
          <span class="feed-request-avatar fallback">•</span>
        </div>
        <div class="feed-request-text">ยังไม่มีคำขอแลก · พร้อมรับข้อเสนอแรก</div>
      </div>
    `;
  }
  const avatars = requests
    .slice(0, 3)
    .map((entry, idx) => {
      const initial = escapeHtml(
        String(entry?.name || `U${idx + 1}`)
          .trim()
          .slice(0, 1)
          .toUpperCase(),
      );
      if (entry?.avatar) {
        return `<span class="feed-request-avatar"><img src="${escapeHtml(entry.avatar)}" alt="${initial}" loading="lazy" /></span>`;
      }
      return `<span class="feed-request-avatar">${initial}</span>`;
    })
    .join("");
  const total = Number(item.requestCount || requests.length || 0);
  return `
    <div class="feed-request-preview">
      <div class="feed-request-avatars">${avatars}</div>
      <div class="feed-request-text">${total.toLocaleString()} คำขอสนใจรายการนี้</div>
    </div>
  `;
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
  const saved = isSaved(item.id);
  const haveImg = pickImage(item, "have");
  const wantImg = pickImage(item, "want");
  const haveEmoji = escapeHtml(itemEmoji(item));
  const wantedText = escapeHtml(item.wantedText || "ยังไม่ได้ระบุสิ่งที่อยากได้");
  const cardTitle = escapeHtml(item.title || "รายการสำหรับ Xwap");
  const location = escapeHtml(item.locationLabel || "Bangkok");
  const category = escapeHtml(item.category || "อื่นๆ");
  const deal = dealTypeLabel(item.dealType);
  const price = escapeHtml(formatPrice(item));
  const requestSummary = escapeHtml(item.requestSummary || wantedText);

  return `
    <article
      class="feed-card ${saved ? "saved" : ""}"
      data-feed-card="1"
      data-item-id="${escapeHtml(item.id)}"
      data-item-title="${escapeHtml(item.title || "")}"
      data-owner-id="${escapeHtml(item.ownerId)}"
      data-item-location="${location}"
      data-item-category="${category}"
      data-item-deal="${escapeHtml(deal)}"
      data-item-price="${price}"
      data-item-wanted="${wantedText}"
      data-item-emoji="${haveEmoji}"
    >
      <button
        class="feed-save-btn ${saved ? "saved" : ""}"
        data-save="1"
        aria-label="${saved ? "ยกเลิกบันทึก" : "บันทึกรายการ"}"
        aria-pressed="${saved ? "true" : "false"}"
      >
        <span class="feed-save-icon">${saved ? "★" : "☆"}</span>
      </button>

      <div class="swap-hero">
        <div class="swap-half own">
          <div class="swap-label">มีอยู่</div>
          <div class="swap-media">
            ${
              haveImg
                ? `<img src="${escapeHtml(haveImg)}" alt="${cardTitle}" loading="lazy" />`
                : `<div class="swap-media-fallback">${haveEmoji}</div>`
            }
          </div>
        </div>
        <div class="swap-half want">
          <div class="swap-label right">อยากได้</div>
          <div class="swap-media">
            ${
              wantImg
                ? `<img src="${escapeHtml(wantImg)}" alt="${wantedText}" loading="lazy" />`
                : `<div class="swap-media-wanted">${wantedText}</div>`
            }
          </div>
        </div>
        <button class="feed-xwap-cta" data-xwap="1" aria-label="ส่งคำขอ Xwap">
          Xwap
        </button>
      </div>

      <div class="feed-card-body">
        <div class="swap-card-title">${cardTitle}</div>
        <div class="swap-card-sub">${location} · ${category} · ${escapeHtml(deal)}</div>
        <div class="feed-meta-row">
          <div class="feed-price">${price}</div>
          <div class="feed-request-summary">${requestSummary}</div>
        </div>
        ${requestPreviewRow(item)}
        <div class="feed-actions">
          <button class="btn primary" data-xwap="1">ส่งคำขอ Xwap</button>
          <button class="btn ghost" data-open-detail="1">ดูรายละเอียด</button>
        </div>
      </div>
    </article>`;
}

export function bindCardActions(container) {
  if (container.dataset.cardActionsBound === "1") return;
  container.dataset.cardActionsBound = "1";

  let touchStartX = 0;
  let touchStartY = 0;
  let swipeCard = null;

  container.addEventListener(
    "touchstart",
    (event) => {
      const card = event.target.closest("[data-feed-card]");
      if (!card) return;
      if (event.target.closest("[data-xwap],[data-save],[data-open-detail]")) return;
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      swipeCard = card;
    },
    { passive: true },
  );

  container.addEventListener(
    "touchend",
    (event) => {
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
    },
    { passive: true },
  );

  container.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const buyBtn = target.closest("[data-buy-now]");
    if (buyBtn) {
      alert("เวอร์ชันนี้ยังไม่ได้ต่อ Buy flow");
      return;
    }

    const saveBtn = target.closest("[data-save]");
    if (saveBtn) {
      const card = saveBtn.closest("[data-item-id]");
      if (!card) return;
      const itemId = card.getAttribute("data-item-id");
      if (!itemId) return;
      const saved = toggleSaved(itemId);
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
      return;
    }

    const xwapBtn = target.closest("[data-xwap]");
    if (xwapBtn) {
      const card = xwapBtn.closest("[data-item-id]");
      if (!card) return;
      card.classList.add("xwap-active");
      window.setTimeout(() => card.classList.remove("xwap-active"), 900);
      openOfferPrompt(
        card.getAttribute("data-item-id"),
        card.getAttribute("data-item-title") || "สินค้า",
        card.getAttribute("data-owner-id"),
      );
      return;
    }

    const detailBtn = target.closest("[data-open-detail]");
    if (detailBtn) {
      const card = detailBtn.closest("[data-feed-card]");
      if (!card) return;
      openFeedDetail(card);
      return;
    }

    const card = target.closest("[data-feed-card]");
    if (card) {
      openFeedDetail(card);
    }
  });
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
    const { loadInbox } = await import("./inbox.js");
    loadInbox();
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
  modal.innerHTML = `
    <div class="feed-detail-backdrop" data-close-feed-detail="1"></div>
    <div class="feed-detail-sheet" role="dialog" aria-modal="true" aria-label="รายละเอียดสินค้า">
      <button class="feed-detail-close" data-close-feed-detail="1" aria-label="ปิด">×</button>
      <div class="feed-detail-content"></div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-close-feed-detail]")) {
      closeFeedDetail();
    }
  });
  return modal;
}

function openFeedDetail(card) {
  const modal = ensureFeedDetailModal();
  const content = modal.querySelector(".feed-detail-content");
  if (!content) return;
  const itemTitle = card.getAttribute("data-item-title") || "รายการสำหรับ Xwap";
  const wanted = card.getAttribute("data-item-wanted") || "ยังไม่ได้ระบุ";
  const location = card.getAttribute("data-item-location") || "Bangkok";
  const category = card.getAttribute("data-item-category") || "-";
  const deal = card.getAttribute("data-item-deal") || "แลกได้";
  const price = card.getAttribute("data-item-price") || "เปิดรับข้อเสนอ";
  const emoji = card.getAttribute("data-item-emoji") || "📦";
  content.innerHTML = `
    <div class="feed-detail-emoji">${emoji}</div>
    <h3>${escapeHtml(itemTitle)}</h3>
    <p class="feed-detail-meta">${escapeHtml(location)} · ${escapeHtml(category)} · ${escapeHtml(deal)}</p>
    <div class="feed-detail-price">${escapeHtml(price)}</div>
    <div class="feed-detail-wanted"><strong>อยากได้:</strong> ${escapeHtml(wanted)}</div>
    <div class="feed-detail-actions">
      <button class="btn primary" data-feed-detail-xwap="1">ส่งคำขอ Xwap</button>
    </div>
  `;
  content.querySelector("[data-feed-detail-xwap]")?.addEventListener("click", () => {
    closeFeedDetail();
    openOfferPrompt(
      card.getAttribute("data-item-id"),
      card.getAttribute("data-item-title") || "สินค้า",
      card.getAttribute("data-owner-id"),
    );
  });
  modal.classList.add("open");
  document.body.classList.add("modal-open");
}

function closeFeedDetail() {
  const modal = document.getElementById(FEED_DETAIL_MODAL_ID);
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("modal-open");
}
