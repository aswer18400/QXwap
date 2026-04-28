import { qs, notify } from "../util.js";
import { state, categories } from "../state.js";
import { items } from "../api.js";
import { authGuard } from "./nav.js";
import { productCardHtml, bindCardActions } from "./cards.js";
import { buildItemQueryParams, syncFiltersFromSearch, syncSearchInputsFromFilters } from "./filters.js";

export { productCardHtml };

function normalizeShopItem(item) {
  return {
    ...item,
    wantedTags: Array.isArray(item?.wantedTags) ? item.wantedTags : [],
    imageUrls: Array.isArray(item?.imageUrls) ? item.imageUrls : undefined,
    image_urls: Array.isArray(item?.image_urls) ? item.image_urls : undefined,
    priceCash: Number(item?.priceCash || 0),
    priceCredit: Number(item?.priceCredit || 0),
  };
}

export function renderCategories() {
  const row = qs("categoryRow");
  if (!row) return;
  row.innerHTML = categories.map((cat) => `
    <div class="category-card ${state.filters.category === cat.key ? "active" : ""}" data-cat-key="${cat.key}">
      <div class="category-icon">${cat.icon}</div>
      <div class="category-name">${cat.name}</div>
    </div>`).join("");
  row.querySelectorAll("[data-cat-key]").forEach((el) => {
    el.addEventListener("click", () => setCategory(el.getAttribute("data-cat-key")));
  });
}

export function setCategory(key) {
  state.currentCategory = key || "all";
  state.filters.category = key || "all";
  renderCategories();
  loadShop();
}

export function setShopFilter(filter, btn) {
  state.shopFilter = filter;
  state.filters.dealType = filter === "all" ? "all" : filter;
  document.querySelectorAll("[data-shop-filter]").forEach((x) => x.classList.remove("active"));
  if (btn) btn.classList.add("active");
  loadShop();
}

export async function loadShop() {
  if (!authGuard()) return;
  notify("shopNotice", "", "");
  syncFiltersFromSearch("shopSearch");
  syncSearchInputsFromFilters();
  const params = buildItemQueryParams("shop");
  try {
    const { items: list } = await items.list(params);
    const grid = qs("shopGrid");
    const normalized = (Array.isArray(list) ? list : []).map(normalizeShopItem);
    grid.innerHTML = normalized.length ? normalized.map(productCardHtml).join("") : `<div class="empty" style="grid-column:1/-1">ยังไม่มีสินค้า</div>`;
    bindCardActions(grid);
  } catch (e) {
    notify("shopNotice", "error", String(e?.message || e));
  }
}
