import { showPage } from "./ui/nav.js";
import {
  loadSession,
  signIn,
  signUp,
  signOut,
  signInWithReplit,
} from "./ui/auth.js";
import { loadFeed, setFeedFilter, setFeedCategory } from "./ui/feed.js";
import {
  renderCategories,
  setCategory,
  setShopFilter,
  loadShop,
} from "./ui/shop.js";
import { resetListingForm, createItem, enhanceListingForm } from "./ui/add.js";
import { setInboxFilter, loadInbox, updateOfferStatus } from "./ui/inbox.js";
import { loadProfile } from "./ui/profile.js";
import { openOfferPrompt } from "./ui/cards.js";
import { openFilterSheet, ensureFilterSheet } from "./ui/filters.js";
import { notify } from "./util.js";

function addFilterButtons() {
  ["feedSearch", "shopSearch"].forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const row = input.closest(".search-row") || input.parentElement?.parentElement;
    if (!row || row.querySelector("[data-open-filter]")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn";
    btn.setAttribute("data-open-filter", "1");
    btn.setAttribute("aria-label", "เปิดตัวกรอง");
    btn.textContent = "⚙️";
    btn.addEventListener("click", openFilterSheet);
    row.appendChild(btn);
  });
}

Object.assign(window, {
  showPage,
  loadSession,
  signIn,
  signUp,
  signOut,
  signInWithReplit,
  loadFeed,
  setFeedFilter,
  setFeedCategory,
  setCategory,
  setShopFilter,
  loadShop,
  resetListingForm,
  createItem,
  enhanceListingForm,
  loadInbox,
  setInboxFilter,
  updateOfferStatus,
  loadProfile,
  openOfferPrompt,
  openFilterSheet,
});

window.addEventListener("error", (e) => {
  notify("authNotice", "error", "เกิดข้อผิดพลาดในหน้าเว็บ: " + e.message);
});

ensureFilterSheet();
addFilterButtons();
enhanceListingForm();
renderCategories();
loadSession();
