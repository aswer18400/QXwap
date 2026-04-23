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
import { resetListingForm, createItem } from "./ui/add.js";
import { setInboxFilter, loadInbox, updateOfferStatus } from "./ui/inbox.js";
import { loadProfile } from "./ui/profile.js";
import { openOfferPrompt } from "./ui/cards.js";
import { notify } from "./util.js";

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
  loadInbox,
  setInboxFilter,
  updateOfferStatus,
  loadProfile,
  openOfferPrompt,
});

window.addEventListener("error", (e) => {
  notify("authNotice", "error", "เกิดข้อผิดพลาดในหน้าเว็บ: " + e.message);
});

renderCategories();
loadSession();
