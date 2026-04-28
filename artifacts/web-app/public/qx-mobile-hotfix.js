(() => {
  const VERSION = "qx-mobile-qa-2026-04-28-2";
  if (window.__QX_MOBILE_QA_HOTFIX__ === VERSION) return;
  window.__QX_MOBILE_QA_HOTFIX__ = VERSION;

  const ready = (fn) => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  };

  function addStyle() {
    if (document.getElementById("qx-mobile-qa-hotfix-style")) return;
    const style = document.createElement("style");
    style.id = "qx-mobile-qa-hotfix-style";
    style.textContent = `
      html, body { scroll-behavior: auto !important; overscroll-behavior-y: contain; }
      .feed-card, .product-card, [data-feed-card], [data-item-id] { touch-action: pan-y manipulation; }
      .detail-sheet, .feed-detail-sheet, .filter-sheet { -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
      .qx-basic-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.34);display:flex;align-items:flex-end;justify-content:center;padding:0 12px 12px}
      .qx-basic-sheet{width:100%;max-width:430px;background:#f7f5f1;border-radius:24px 24px 18px 18px;box-shadow:0 -12px 34px rgba(0,0,0,.18);padding:16px;color:#171614}
      .qx-basic-sheet h3{margin:0 0 8px;font-size:22px;line-height:1.15}.qx-basic-sheet p{margin:6px 0;color:#756d63;font-size:14px;line-height:1.45}
      .qx-basic-actions{display:flex;gap:8px;margin-top:14px}.qx-basic-actions button{flex:1;height:44px;border:0;border-radius:14px;font-weight:900}.qx-primary{background:#3f6df6;color:#fff}.qx-soft{background:#e7e1d8;color:#171614}
      .profile-photo-save{margin-top:8px;display:flex;gap:8px;align-items:center}.profile-photo-save input{max-width:100%;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  function clearStaleServiceWorkerOnce() {
    try {
      const key = "qx-mobile-cache-reset-version";
      if (localStorage.getItem(key) === VERSION) return;
      localStorage.setItem(key, VERSION);
      if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      if (window.caches) caches.keys().then((keys) => keys.filter((k) => /^qxwap-/i.test(k)).forEach((k) => caches.delete(k))).catch(() => {});
    } catch {}
  }

  function textOf(el, selector, fallback = "") {
    return el?.querySelector(selector)?.textContent?.trim() || el?.getAttribute(selector) || fallback;
  }

  function getItemId(card) {
    return card?.getAttribute("data-item-id") || card?.dataset?.itemId || card?.getAttribute("data-api-item-id") || card?.dataset?.apiItemId || "";
  }

  function getCardTitle(card) {
    return card?.getAttribute("data-item-title") || card?.querySelector(".swap-card-title,.product-title,.feed-title")?.textContent?.trim() || "สินค้า";
  }

  async function callFirst(names, args) {
    for (const name of names) {
      const fn = window[name];
      if (typeof fn === "function") {
        try {
          await fn(...args);
          return true;
        } catch (error) {
          console.warn(`[QXwap hotfix] ${name} failed`, error);
        }
      }
    }
    return false;
  }

  function openFallbackDetail(card) {
    const old = document.getElementById("qx-basic-detail-modal");
    if (old) old.remove();
    const title = getCardTitle(card);
    const meta = card?.querySelector(".swap-card-sub,.product-meta,.feed-location")?.textContent?.trim() || card?.getAttribute("data-item-location") || "";
    const price = card?.querySelector(".feed-price,.price")?.textContent?.trim() || card?.getAttribute("data-item-price") || "";
    const wanted = card?.querySelector(".wanted-tags,.feed-request-summary")?.textContent?.trim() || card?.getAttribute("data-item-wanted") || "";
    const modal = document.createElement("div");
    modal.id = "qx-basic-detail-modal";
    modal.className = "qx-basic-modal";
    modal.innerHTML = `<div class="qx-basic-sheet"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(meta)}</p><p><strong>${escapeHtml(price)}</strong></p><p>${escapeHtml(wanted)}</p><div class="qx-basic-actions"><button class="qx-primary" data-qx-basic-xwap="1">Xwap</button><button class="qx-soft" data-qx-basic-close="1">ปิด</button></div></div>`;
    modal.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-qx-basic-close]")) modal.remove();
      if (target.closest("[data-qx-basic-xwap]")) {
        modal.remove();
        openXwap(card);
      }
    });
    document.body.appendChild(modal);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  async function openDetail(card) {
    const itemId = getItemId(card);
    const called = await callFirst(["openDetailByItemId", "openItemDetail", "openProductDetail", "showProductDetail", "openDetail"], [itemId, card]);
    if (!called) openFallbackDetail(card);
  }

  async function openXwap(card) {
    const itemId = getItemId(card);
    const title = getCardTitle(card);
    const ownerId = card?.getAttribute("data-owner-id") || card?.dataset?.ownerId || "";
    const called = await callFirst(["openOfferPrompt", "openRequestOffer", "requestOffer", "startXwap", "openXwap"], [itemId, title, ownerId]);
    if (!called) {
      const message = prompt(`ข้อความถึงเจ้าของสินค้า (${title})`, "สนใจ Xwap ครับ");
      if (message !== null) alert("รับข้อมูลข้อเสนอแล้ว แต่หน้านี้ยังไม่ได้ต่อ API โดยตรง กรุณาลองอีกครั้งหลัง deploy ล่าสุด");
    }
  }

  function bindCardFallbacks() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const card = target.closest("[data-item-id], [data-feed-card], .feed-card, .product-card");
      if (!card) return;
      if (target.closest("input, textarea, select, [data-save], .feed-save-btn, .wanted-tag, [data-wanted-tag]")) return;
      const isXwap = target.closest("[data-xwap], .feed-xwap-cta") || /xwap|แลก/i.test(target.textContent || "");
      const isDetail = target.closest("[data-open-detail]") || !target.closest("button,a");
      if (!isXwap && !isDetail) return;
      event.preventDefault();
      event.stopPropagation();
      if (isXwap) openXwap(card);
      else openDetail(card);
    }, true);
  }

  function installProfilePhotoFallback() {
    const root = document.querySelector(".profile-summary") || document.getElementById("page-profile") || document.body;
    if (!root || document.getElementById("qxProfilePhotoInput")) return;
    const holder = root.querySelector(".profile-photo") || root.querySelector("[data-profile-photo]");
    if (!holder) return;
    const row = document.createElement("div");
    row.className = "profile-photo-save";
    row.innerHTML = `<input id="qxProfilePhotoInput" type="file" accept="image/*" /><button type="button" class="qx-soft" id="qxProfilePhotoSave">บันทึกรูป</button>`;
    holder.insertAdjacentElement("afterend", row);
    const saved = localStorage.getItem("qx-profile-avatar-url");
    const img = holder.querySelector("img") || document.querySelector(".profile-photo img");
    if (saved && img) img.src = saved;
    row.querySelector("button")?.addEventListener("click", async () => {
      const input = row.querySelector("input");
      const file = input?.files?.[0];
      if (!file) return alert("เลือกรูปก่อน");
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result || "");
        try {
          if (window.profiles?.update) await window.profiles.update({ avatarUrl: dataUrl });
          else await fetch(((window.__API_BASE__ || "/api").replace(/\/$/, "")) + "/profiles/me", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatarUrl: dataUrl }) });
        } catch {}
        localStorage.setItem("qx-profile-avatar-url", dataUrl);
        if (img) img.src = dataUrl;
        alert("บันทึกรูปโปรไฟล์แล้ว");
      };
      reader.readAsDataURL(file);
    });
  }

  function watchProfilePage() {
    const run = () => installProfilePhotoFallback();
    run();
    new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  }

  ready(() => {
    addStyle();
    clearStaleServiceWorkerOnce();
    bindCardFallbacks();
    watchProfilePage();
  });
})();
