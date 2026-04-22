import { qs, notify } from "../util.js";
import { state } from "../state.js";
import { loadFeed } from "./items.js";
import { loadShop } from "./items.js";
import { loadInbox } from "./offers.js";
import { loadProfile } from "./profile.js";

export function showPage(pageId, el) {
  document
    .querySelectorAll(".page")
    .forEach((p) => p.classList.remove("active"));
  const target = qs(pageId);
  if (target) target.classList.add("active");
  document
    .querySelectorAll(".nav-item")
    .forEach((i) => i.classList.toggle("active", i.dataset.page === pageId));
  if (pageId === "page-feed") loadFeed();
  if (pageId === "page-shop") loadShop();
  if (pageId === "page-inbox") loadInbox();
  if (pageId === "page-profile") loadProfile();
}

export function authGuard() {
  if (!state.currentUser) {
    showPage("page-auth");
    notify("authNotice", "error", "กรุณาเข้าสู่ระบบก่อน");
    return false;
  }
  return true;
}
