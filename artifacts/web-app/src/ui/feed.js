import { qs, notify } from "../util.js";
import { state } from "../state.js";
import { items } from "../api.js";
import { authGuard } from "./nav.js";
import { feedCardHtml, bindCardActions } from "./cards.js";

export { feedCardHtml };

export function setFeedFilter(filter, btn) {
  state.feedFilter = filter;
  document
    .querySelectorAll("[data-feed-filter]")
    .forEach((x) => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadFeed();
}

export async function loadFeed() {
  if (!authGuard()) return;
  notify("feedNotice", "", "");
  const search = qs("feedSearch").value.trim();
  const params = { search };
  if (state.feedFilter === "swap") params.deal_type = "swap";
  if (state.feedFilter === "both") params.deal_type = "both";
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
