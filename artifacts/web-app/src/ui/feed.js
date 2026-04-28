import { qs, notify } from "../util.js";
import { state, categories } from "../state.js";
import { items } from "../api.js";
import { authGuard } from "./nav.js";
import { feedCardHtml, bindCardActions, loadSavedListings } from "./cards.js";
import { buildItemQueryParams, syncFiltersFromSearch, syncSearchInputsFromFilters } from "./filters.js";

export { feedCardHtml };

export function setFeedFilter(filter, btn) {
  state.feedFilter = filter;
  state.filters.dealType = filter === "all" ? "all" : filter;
  document.querySelectorAll("[data-feed-filter]").forEach((x) => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
  syncFeedFilterButtons();
  loadFeed();
}

export function setFeedCategory(category, btn) {
  state.feedCategory = category;
  state.filters.category = category || "all";
  document.querySelectorAll("[data-feed-category]").forEach((x) => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
  syncFeedCategoryButtons();
  loadFeed();
}

function feedSkeletonCardHtml() {
  return `
    <article class="feed-card skeleton-card" aria-hidden="true">
      <div class="swap-hero"><div class="swap-half"><div class="swap-media skeleton-block"></div></div><div class="swap-half"><div class="swap-media skeleton-block"></div></div></div>
      <div class="feed-card-body"><div class="skeleton-line w-70"></div><div class="skeleton-line w-55"></div><div class="skeleton-line w-85"></div></div>
    </article>`;
}

function emptyFeedStateHtml() {
  return `<div class="empty feed-empty-state"><div class="feed-empty-title">ยังไม่พบรายการที่ตรงกับเงื่อนไข</div><div class="feed-empty-sub">ลองเปลี่ยนคำค้นหา ตัวกรอง หรือหมวดหมู่</div></div>`;
}

function feedErrorStateHtml(message) {
  return `<div class="empty feed-empty-state"><div class="feed-empty-title">โหลดรายการไม่สำเร็จ</div><div class="feed-empty-sub">${message}</div></div>`;
}

function normalizeFeedItem(item) {
  return {
    id: item?.id || `item-${Math.random().toString(16).slice(2)}`,
    ownerId: item?.ownerId || "",
    title: item?.title || "รายการสำหรับ Xwap",
    category: item?.category || "อื่นๆ",
    locationLabel: item?.locationLabel || "Bangkok",
    dealType: item?.dealType || "swap",
    priceCash: Number(item?.priceCash || 0),
    priceCredit: Number(item?.priceCredit || 0),
    wantedText: item?.wantedText || "",
    wantedTags: Array.isArray(item?.wantedTags) ? item.wantedTags : [],
    openToOffers: Boolean(item?.openToOffers),
    requestSummary: item?.requestSummary || "",
    requestCount: Number(item?.requestCount || 0),
    requestPreview: Array.isArray(item?.requestPreview) ? item.requestPreview : [],
    imageEmoji: item?.imageEmoji || "📦",
    conditionLabel: item?.conditionLabel || "สภาพดี",
    imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls : undefined,
    image_urls: Array.isArray(item?.image_urls) ? item.image_urls : undefined,
    imageUrl: typeof item?.imageUrl === "string" ? item.imageUrl : undefined,
    images: Array.isArray(item?.images) ? item.images : undefined,
  };
}

function renderFeedSkeleton(feed) {
  feed.innerHTML = Array.from({ length: 3 }, feedSkeletonCardHtml).join("");
}

function syncFeedFilterButtons() {
  document.querySelectorAll("[data-feed-filter]").forEach((button) => {
    const isActive = button.getAttribute("data-feed-filter") === state.feedFilter;
    button.classList.toggle("active", isActive);
  });
}

function renderFeedCategoryRow() {
  const row = qs("feedCategoryRow");
  if (!row) return;
  row.innerHTML = categories.map((cat) => {
    const active = state.filters.category === cat.key || state.feedCategory === cat.key;
    return `<button type="button" class="feed-category-chip ${active ? "active" : ""}" data-feed-category="${cat.key}" aria-pressed="${active ? "true" : "false"}"><span class="feed-category-icon">${cat.icon}</span><span>${cat.name}</span></button>`;
  }).join("");
  row.querySelectorAll("[data-feed-category]").forEach((button) => {
    button.addEventListener("click", () => setFeedCategory(button.getAttribute("data-feed-category"), button));
  });
}

function syncFeedCategoryButtons() {
  document.querySelectorAll("[data-feed-category]").forEach((button) => {
    const isActive = button.getAttribute("data-feed-category") === state.filters.category;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function hasUnifiedFilterApplied(params) {
  return Object.entries(params).some(([key, value]) => key !== "deal_type" && String(value || "").trim() !== "") || params.deal_type !== "feed";
}

export async function loadFeed() {
  if (!authGuard()) return;
  notify("feedNotice", "", "");
  syncFiltersFromSearch("feedSearch");
  syncSearchInputsFromFilters();
  const feed = qs("feedList");
  renderFeedCategoryRow();
  syncFeedFilterButtons();
  syncFeedCategoryButtons();
  renderFeedSkeleton(feed);

  const params = buildItemQueryParams("feed");
  const hasFilterApplied = hasUnifiedFilterApplied(params);

  try {
    await loadSavedListings();
    const response = hasFilterApplied ? await items.list(params) : await items.feed();
    let list = (Array.isArray(response?.items) ? response.items : []).filter((i) => i?.dealType !== "buy").map(normalizeFeedItem);
    feed.innerHTML = list.length ? list.map(feedCardHtml).join("") : emptyFeedStateHtml();
    bindCardActions(feed);
  } catch (e) {
    const message = String(e?.message || e);
    notify("feedNotice", "error", message);
    feed.innerHTML = feedErrorStateHtml(message);
  }
}
