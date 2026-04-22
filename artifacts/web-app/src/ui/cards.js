import { escapeHtml, itemEmoji } from "../util.js";
import { state } from "../state.js";
import { offers } from "../api.js";
import { authGuard } from "./nav.js";

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
