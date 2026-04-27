import { qs, notify, debugStatus } from "../util.js";
import { items, uploads } from "../api.js";
import { authGuard } from "./nav.js";
import { loadShop } from "./shop.js";
import { loadFeed } from "./feed.js";
import { loadProfile } from "./profile.js";

export function resetListingForm() {
  [
    "itemTitle",
    "itemDescription",
    "itemWanted",
    "itemPriceCash",
    "itemPriceCredit",
  ].forEach((id) => (qs(id).value = ""));
  qs("itemEmoji").value = "📦";
  qs("itemLocation").value = "Bangkok";
  qs("itemDealType").value = "swap";
  qs("itemCategory").value = "electronics";
  notify("addNotice", "", "");
}

export async function createItem() {
  debugStatus("กำลังบันทึกสินค้า...");
  if (!authGuard()) return;
  notify("addNotice", "", "");
  const payload = {
    title: qs("itemTitle").value.trim(),
    description: qs("itemDescription").value.trim(),
    category: qs("itemCategory").value,
    conditionLabel: "สภาพดี",
    dealType: qs("itemDealType").value,
    priceCash: Number(qs("itemPriceCash").value || 0),
    priceCredit: Number(qs("itemPriceCredit").value || 0),
    wantedText: qs("itemWanted").value.trim(),
    locationLabel: qs("itemLocation").value.trim() || "Bangkok",
    imageEmoji: qs("itemEmoji").value.trim() || "📦",
  };
  const imageInput = document.getElementById("itemImages");
  const imageFiles =
    imageInput instanceof HTMLInputElement && imageInput.files
      ? Array.from(imageInput.files)
      : [];
  if (!payload.title) return notify("addNotice", "error", "กรอกชื่อสินค้าก่อน");
  if (!payload.category)
    return notify("addNotice", "error", "เลือกหมวดหมู่ก่อน");
  if (payload.priceCash < 0 || payload.priceCredit < 0)
    return notify("addNotice", "error", "ราคาติดลบไม่ได้");
  try {
    if (imageFiles.length) {
      notify("addNotice", "ok", "กำลังอัปโหลดรูป...");
      const { urls } = await uploads.images(imageFiles);
      if (Array.isArray(urls) && urls.length) {
        payload.imageUrls = urls;
      }
    }
    await items.create(payload);
    resetListingForm();
    if (imageInput instanceof HTMLInputElement) {
      imageInput.value = "";
    }
    notify("addNotice", "ok", "เพิ่มสินค้าสำเร็จ");
    loadShop();
    loadFeed();
    loadProfile();
  } catch (e) {
    notify("addNotice", "error", String(e?.message || e));
  }
}
