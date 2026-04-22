import { qs, notify } from "../util.js";
import { state } from "../state.js";
import { items, profiles } from "../api.js";
import { authGuard } from "./nav.js";
import { productCardHtml, bindCardActions } from "./cards.js";

export async function loadProfile() {
  if (!authGuard()) return;
  notify("profileNotice", "", "");
  try {
    const me = state.currentUser;
    const { profile } = await profiles.get(me.id);
    qs("profileName").textContent =
      profile?.displayName || me.email?.split("@")[0] || "User";
    qs("profileEmail").textContent = me.email || "-";
    const { items: mine } = await items.list({ owner_id: me.id });
    const grid = qs("profileGrid");
    grid.innerHTML = mine.length
      ? mine.map(productCardHtml).join("")
      : `<div class="empty" style="grid-column:1/-1">ยังไม่มีสินค้าของคุณ</div>`;
    bindCardActions(grid);
  } catch (e) {
    notify("profileNotice", "error", String(e?.message || e));
  }
}
