export const qs = (id) => document.getElementById(id);

export function itemEmoji(item) {
  return (
    item?.imageEmoji ||
    (item?.category === "phone"
      ? "📱"
      : item?.category === "fashion"
        ? "👕"
        : item?.category === "home"
          ? "🏠"
          : "📦")
  );
}

export function escapeHtml(str = "") {
  return String(str).replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[m],
  );
}

export function notify(id, type, text) {
  const el = qs(id);
  if (!el) return;
  if (!text) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `<div class="notice ${type}">${escapeHtml(text)}</div>`;
}

export function debugStatus(text) {
  let el = qs("debugStatus");
  if (!el) {
    el = document.createElement("div");
    el.id = "debugStatus";
    el.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:96px;z-index:9999;background:#111;color:#fff;padding:10px 12px;border-radius:14px;font-size:13px;opacity:.96";
    document.body.appendChild(el);
  }
  el.textContent = text;
  clearTimeout(window.__debugTimer);
  window.__debugTimer = setTimeout(() => {
    if (el) el.remove();
  }, 3000);
}
