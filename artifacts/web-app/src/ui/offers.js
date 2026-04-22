import { qs, escapeHtml, notify } from "../util.js";
import { state } from "../state.js";
import { offers } from "../api.js";
import { authGuard } from "./nav.js";

export function setInboxFilter(filter, btn) {
  state.inboxFilter = filter;
  document
    .querySelectorAll("#page-inbox .chip")
    .forEach((x) => x.classList.remove("active"));
  btn.classList.add("active");
  loadInbox();
}

export async function loadInbox() {
  if (!authGuard()) return;
  notify("inboxNotice", "", "");
  const keyword = qs("inboxSearch").value.trim().toLowerCase();
  let list;
  try {
    const res = await offers.list();
    list = res.offers || [];
  } catch (e) {
    return notify("inboxNotice", "error", String(e?.message || e));
  }
  const me = state.currentUser.id;
  if (state.inboxFilter === "action")
    list = list.filter((x) => x.receiverId === me && x.status === "pending");
  if (state.inboxFilter === "mine")
    list = list.filter((x) => ["pending", "accepted"].includes(x.status));
  if (state.inboxFilter === "closed")
    list = list.filter((x) => ["rejected", "canceled"].includes(x.status));
  if (keyword)
    list = list.filter(
      (x) =>
        (x.item?.title || "").toLowerCase().includes(keyword) ||
        (x.message || "").toLowerCase().includes(keyword),
    );
  const container = qs("inboxList");
  container.innerHTML = list.length
    ? list
        .map(
          (offer) => `
    <div class="list-card" style="margin-bottom:14px">
      <div class="offer-status">${escapeHtml(offer.status)}</div>
      <div style="font-size:18px;font-weight:900;margin-bottom:6px">${escapeHtml(offer.item?.title || "สินค้า")}</div>
      <div class="muted mini">${offer.senderId === me ? "คุณเป็นผู้ส่งข้อเสนอ" : "คุณเป็นผู้รับข้อเสนอ"}</div>
      <div style="margin:12px 0 14px">${escapeHtml(offer.message || "-")}</div>
      <div class="btn-row">
        ${
          offer.receiverId === me && offer.status === "pending"
            ? `<button class="btn primary" data-offer-action="accepted" data-offer-id="${escapeHtml(offer.id)}">รับข้อเสนอ</button><button class="btn ghost" data-offer-action="rejected" data-offer-id="${escapeHtml(offer.id)}">ปฏิเสธ</button>`
            : ""
        }
      </div>
    </div>`,
        )
        .join("")
    : `<div class="empty">ยังไม่มีรายการในสถานะนี้</div>`;
  container.querySelectorAll("[data-offer-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      updateOfferStatus(
        btn.getAttribute("data-offer-id"),
        btn.getAttribute("data-offer-action"),
      );
    });
  });
}

export async function updateOfferStatus(offerId, status) {
  try {
    await offers.updateStatus(offerId, status);
    loadInbox();
  } catch (e) {
    alert(String(e?.message || e));
  }
}
