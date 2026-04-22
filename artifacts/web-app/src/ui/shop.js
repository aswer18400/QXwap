import { qs, notify } from "../util.js";
import { state, categories } from "../state.js";
import { items } from "../api.js";
import { authGuard } from "./nav.js";
import { feedCardHtml, bindCardActions } from "./cards.js";

export { feedCardHtml };

export function renderCategories() {
  const row = qs("categoryRow");
  row.innerHTML = categories
    .map(
      (cat) => `
    <div class="category-card ${state.currentCategory === cat.key ? "active" : ""}" data-cat-key="${cat.key}">
      <div class="category-icon">${cat.icon}</div>
      <div class="category-name">${cat.name}</div>
    </div>`,
    )
    .join("");
  row.querySelectorAll("[data-cat-key]").forEach((el) => {
    el.addEventListener("click", () =>
      setCategory(el.getAttribute("data-cat-key")),
    );
  });
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
  if (btn) btn.classList.add("active");
  loadShop();
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
      ? list.map(feedCardHtml).join("")
      : `<div class="empty">ยังไม่มีสินค้า</div>`;
    bindCardActions(grid);
  } catch (e) {
    notify("shopNotice", "error", String(e?.message || e));
  }
}
