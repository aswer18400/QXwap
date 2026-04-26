import { qs, notify } from "../util.js";
import { state, categories } from "../state.js";
import { items } from "../api.js";
import { authGuard } from "./nav.js";
import { feedCardHtml, bindCardActions, loadSavedListings } from "./cards.js";

export { feedCardHtml };

const FALLBACK_FEED_ITEMS = [
  {
    id: "fallback-phone-1",
    ownerId: "seed-owner-1",
    title: "iPhone 14 Pro Max 256GB",
    category: "phone",
    locationLabel: "Bangkok",
    dealType: "both",
    priceCash: 28900,
    wantedText: "MacBook Air M1 หรือ iPad Pro พร้อม Apple Pencil",
    requestSummary: "เปิดรับข้อเสนอของใกล้เคียง",
    conditionLabel: "สภาพดี",
    imageEmoji: "📱",
    requestCount: 12,
    requestPreview: [
      { name: "Mint", avatar: "" },
      { name: "Tee", avatar: "" },
      { name: "Ploy", avatar: "" },
    ],
  },
  {
    id: "fallback-laptop-2",
    ownerId: "seed-owner-2",
    title: "MacBook Pro 14” M2 พร้อมกล่อง",
    category: "electronics",
    locationLabel: "ลาดพร้าว",
    dealType: "swap",
    priceCash: 0,
    priceCredit: 0,
    wantedText: "Sony A6400 + เลนส์ หรือเครดิตมูลค่าใกล้เคียง",
    requestSummary: "อยากได้กล้อง mirrorless",
    conditionLabel: "สภาพดีมาก",
    imageEmoji: "💻",
    requestCount: 8,
    requestPreview: [{ name: "Aom" }, { name: "Beam" }],
  },
  {
    id: "fallback-fashion-3",
    ownerId: "seed-owner-3",
    title: "Nike Dunk Low Panda ไซซ์ 42",
    category: "fashion",
    locationLabel: "ใกล้ฉัน",
    dealType: "both",
    priceCash: 3900,
    wantedText: "Stussy Jacket สีดำ ไซซ์ M",
    requestSummary: "พร้อมแลกเสื้อผ้าสตรีทแวร์",
    conditionLabel: "95%",
    imageEmoji: "👟",
    requestCount: 3,
    requestPreview: [{ name: "Ken" }],
  },
];

export function setFeedFilter(filter, btn) {
  state.feedFilter = filter;
  document
    .querySelectorAll("[data-feed-filter]")
    .forEach((x) => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
  syncFeedFilterButtons();
  loadFeed();
}

export function setFeedCategory(category, btn) {
  state.feedCategory = category;
  document
    .querySelectorAll("[data-feed-category]")
    .forEach((x) => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
  syncFeedCategoryButtons();
  loadFeed();
}

function feedSkeletonCardHtml() {
  return `
    <article class="feed-card skeleton-card" aria-hidden="true">
      <div class="swap-hero">
        <div class="swap-half"><div class="swap-media skeleton-block"></div></div>
        <div class="swap-half"><div class="swap-media skeleton-block"></div></div>
      </div>
      <div class="feed-card-body">
        <div class="skeleton-line w-70"></div>
        <div class="skeleton-line w-55"></div>
        <div class="skeleton-line w-85"></div>
      </div>
    </article>
  `;
}

function emptyFeedStateHtml() {
  return `
    <div class="empty feed-empty-state">
      <div class="feed-empty-title">ยังไม่พบรายการที่ตรงกับเงื่อนไข</div>
      <div class="feed-empty-sub">ลองเปลี่ยนคำค้นหา ตัวกรอง หรือหมวดหมู่</div>
    </div>
  `;
}

function fallbackFeedStateHtml(list) {
  return `
    <div class="empty feed-fallback-state">
      <div class="feed-empty-title">ยังไม่มีข้อมูลจากฐานข้อมูลในตอนนี้</div>
      <div class="feed-empty-sub">แสดงการ์ดตัวอย่างเพื่อให้ฟีดไม่ว่างเปล่า</div>
    </div>
    ${list.map(feedCardHtml).join("")}
  `;
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
    requestSummary: item?.requestSummary || "",
    requestCount: Number(item?.requestCount || 0),
    requestPreview: Array.isArray(item?.requestPreview) ? item.requestPreview : [],
    imageEmoji: item?.imageEmoji || "📦",
    conditionLabel: item?.conditionLabel || "สภาพดี",
    imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls : undefined,
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
  row.innerHTML = categories
    .map((cat) => {
      const active = state.feedCategory === cat.key;
      return `
      <button
        type="button"
        class="feed-category-chip ${active ? "active" : ""}"
        data-feed-category="${cat.key}"
        aria-pressed="${active ? "true" : "false"}"
      >
        <span class="feed-category-icon">${cat.icon}</span>
        <span>${cat.name}</span>
      </button>
    `;
    })
    .join("");
  row.querySelectorAll("[data-feed-category]").forEach((button) => {
    button.addEventListener("click", () =>
      setFeedCategory(button.getAttribute("data-feed-category"), button),
    );
  });
}

function syncFeedCategoryButtons() {
  document.querySelectorAll("[data-feed-category]").forEach((button) => {
    const isActive = button.getAttribute("data-feed-category") === state.feedCategory;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

export async function loadFeed() {
  if (!authGuard()) return;
  notify("feedNotice", "", "");
  const search = qs("feedSearch").value.trim();
  const feed = qs("feedList");
  renderFeedCategoryRow();
  syncFeedFilterButtons();
  syncFeedCategoryButtons();
  renderFeedSkeleton(feed);

  const params = { search };
  if (state.feedFilter === "swap") params.deal_type = "swap";
  if (state.feedFilter === "both") params.deal_type = "both";
  if (state.feedFilter === "all") params.deal_type = "feed";
  if (state.feedCategory !== "all") params.category = state.feedCategory;

  const hasFilterApplied =
    Boolean(search) || state.feedFilter !== "all" || state.feedCategory !== "all";

  try {
    await loadSavedListings();

    // Use the smart feed endpoint when browsing without filters;
    // use filtered list endpoint when user has applied search/category/type.
    const response = hasFilterApplied
      ? await items.list(params)
      : await items.feed();

    let list = (Array.isArray(response?.items) ? response.items : [])
      .filter((i) => i?.dealType !== "buy")
      .map(normalizeFeedItem);

    if (list.length) {
      feed.innerHTML = list.map(feedCardHtml).join("");
    } else {
      feed.innerHTML = emptyFeedStateHtml();
    }
    bindCardActions(feed);
  } catch (e) {
    notify("feedNotice", "error", String(e?.message || e));
    feed.innerHTML = fallbackFeedStateHtml(FALLBACK_FEED_ITEMS);
    bindCardActions(feed);
  }
}
