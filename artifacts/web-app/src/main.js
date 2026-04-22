import { showPage, authGuard } from "./ui/nav.js";
import {
  loadSession,
  signIn,
  signUp,
  signOut,
  signInWithReplit,
} from "./ui/auth.js";
import {
  renderCategories,
  setCategory,
  setShopFilter,
  setFeedFilter,
  resetListingForm,
  createItem,
  loadShop,
  loadFeed,
  openOfferPrompt,
} from "./ui/items.js";
import { setInboxFilter, loadInbox, updateOfferStatus } from "./ui/offers.js";
import { loadProfile } from "./ui/profile.js";
import { notify } from "./util.js";

window.QX = {
  showPage,
  authGuard,
  loadSession,
  signIn,
  signUp,
  signOut,
  signInWithReplit,
  renderCategories,
  setCategory,
  setShopFilter,
  setFeedFilter,
  resetListingForm,
  createItem,
  loadShop,
  loadFeed,
  loadInbox,
  setInboxFilter,
  updateOfferStatus,
  loadProfile,
  openOfferPrompt,
};

window.addEventListener("error", (e) => {
  notify("authNotice", "error", "เกิดข้อผิดพลาดในหน้าเว็บ: " + e.message);
});

renderCategories();
loadSession();
