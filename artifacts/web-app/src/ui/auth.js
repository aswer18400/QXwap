import { qs, notify, debugStatus } from "../util.js";
import { state } from "../state.js";
import { auth } from "../api.js";
import { showPage } from "./nav.js";
import { renderCategories, loadShop } from "./shop.js";
import { loadFeed } from "./feed.js";
import { loadInbox } from "./inbox.js";
import { loadProfile } from "./profile.js";
import { clearSavedCache } from "./cards.js";

function setAuthLoading(isLoading, text = "กำลังทำรายการ...") {
  const inBtn = qs("signInBtn");
  const upBtn = qs("signUpBtn");
  if (inBtn) {
    inBtn.disabled = isLoading;
    inBtn.textContent = isLoading ? text : "เข้าใช้";
  }
  if (upBtn) {
    upBtn.disabled = isLoading;
    upBtn.textContent = isLoading ? text : "สมัคร";
  }
}

async function afterAuth() {
  renderCategories();
  showPage("page-feed");
  loadProfile();
  loadShop();
  loadFeed();
  loadInbox();
}

export async function loadSession() {
  try {
    const { user } = await auth.me();
    state.currentUser = user || null;
  } catch {
    state.currentUser = null;
  }
  if (state.currentUser) {
    afterAuth();
  } else {
    showPage("page-auth");
  }
}

export async function signUp() {
  debugStatus("กำลังสมัคร...");
  const email = qs("authEmail").value.trim();
  const password = qs("authPassword").value.trim();
  if (!email || !password) {
    notify("authNotice", "error", "กรอกอีเมลและรหัสผ่านก่อน");
    return;
  }
  if (password.length < 6) {
    notify("authNotice", "error", "รหัสผ่านต้องอย่างน้อย 6 ตัว");
    return;
  }
  setAuthLoading(true);
  try {
    const { user } = await auth.signup(email, password);
    state.currentUser = user;
    notify("authNotice", "ok", "สมัครและเข้าสู่ระบบสำเร็จ");
    afterAuth();
  } catch (e) {
    notify("authNotice", "error", String(e?.message || e));
  } finally {
    setAuthLoading(false);
  }
}

export async function signIn() {
  debugStatus("กำลังเข้าใช้...");
  const email = qs("authEmail").value.trim();
  const password = qs("authPassword").value.trim();
  if (!email || !password) {
    notify("authNotice", "error", "กรอกอีเมลและรหัสผ่านก่อน");
    return;
  }
  setAuthLoading(true);
  try {
    const { user } = await auth.signin(email, password);
    state.currentUser = user;
    notify("authNotice", "ok", "เข้าสู่ระบบสำเร็จ");
    afterAuth();
  } catch (e) {
    notify("authNotice", "error", String(e?.message || e));
  } finally {
    setAuthLoading(false);
  }
}

export async function signOut() {
  try {
    await auth.signout();
  } catch {}
  clearSavedCache();
  state.currentUser = null;
  showPage("page-auth");
  notify("authNotice", "ok", "ออกจากระบบแล้ว");
}

export function signInWithReplit() {
  window.location.href = auth.replitLoginUrl();
}
