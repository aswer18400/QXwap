import type { Filters } from "./constants";
import { conditionScores, filterSummaryLabels, wantedFallbacks } from "./constants";
import type { Item, User } from "./types";

export function toFiniteNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatRatingValue(value: unknown, digits = 1) {
  const rating = toFiniteNumber(value, 0);
  return rating > 0 ? rating.toFixed(digits) : "";
}

export function formatDistanceKmValue(value: unknown) {
  const distance = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(distance)) return "";
  if (distance < 1) return "< 1 กม.";
  if (distance < 10) return `${distance.toFixed(1)} กม.`;
  return `${Math.round(distance)} กม.`;
}

export function conditionPercent(item: Item) {
  const found = String(item.condition || "").match(/\d+/)?.[0];
  return found ? Number(found) : conditionScores[item.condition] ?? 82;
}

export function profileLevel(profile?: User | null) {
  const level = Number(profile?.account_level ?? 0);
  if (level === 4) return { key: "level-4", label: "Level 4", title: "บัญชีถูกจำกัด", note: "ดูข้อมูลได้ แต่ยังส่งข้อเสนอไม่ได้" };
  if (level === 3) return { key: "level-3", label: "Level 3", title: "ผู้ใช้เครดิต", note: "พร้อมใช้เครดิตในข้อเสนอและรับรางวัลการแลก" };
  if (level === 2) return { key: "level-2", label: "Level 2", title: "ผู้ใช้พร้อมแลก", note: "ลงสินค้า ส่งข้อเสนอ และจัดการดีลได้ครบ" };
  if (level === 1) return { key: "level-1", label: "Level 1", title: "สมาชิกใช้งาน", note: "เข้าสู่ระบบแล้ว เริ่มสะสมรายการและติดตามร้านได้" };
  return { key: "level-0", label: "Level 0", title: "ผู้เยี่ยมชม", note: "ยังไม่ได้เข้าสู่ระบบ" };
}

export function canXwap(user?: User | null) {
  return Boolean(user) && Number(user?.account_level ?? 2) !== 4;
}

export function wantedImage(item: Item) {
  const tag = item.wanted.tags[0]?.toLowerCase() || "";
  if (tag.includes("กล้อง")) return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=80";
  if (tag.includes("กาแฟ")) return "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=700&q=80";
  if (tag.includes("รองเท้า")) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80";
  if (tag.includes("switch")) return "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=700&q=80";
  return wantedFallbacks[item.category] || wantedFallbacks.Other;
}

export function recommendationScore(target: Item, myItem?: Item | null, index = 0) {
  const tagMatch = myItem?.wanted.tags?.some(
    (tag) => target.wanted.tags.includes(tag) || target.title.toLowerCase().includes(tag.toLowerCase())
  )
    ? 10
    : 0;
  const base =
    70 +
    (target.is_fast_responder ? 8 : 0) +
    (target.is_featured ? 6 : 0) +
    Math.min(8, target.stats.requests || 0) +
    tagMatch -
    Math.min(7, index);
  return Math.max(62, Math.min(96, base));
}

export function matchReason(target: Item, mine?: Item | null) {
  const reasons = [];
  if (mine) reasons.push("เทียบจากของที่คุณมี");
  if (target.is_fast_responder) reasons.push("เจ้าของตอบไว");
  if (target.is_featured) reasons.push("โปรไฟล์น่าเชื่อถือ");
  if (target.wanted.tags.length) reasons.push(`ตรงกับสิ่งที่อยากได้: ${target.wanted.tags[0]}`);
  return reasons.slice(0, 3).join(" · ");
}

export function activeFilterLabels(filters: Filters) {
  return Object.entries(filters)
    .filter(([key, value]) => !["sort", "latitude", "longitude"].includes(key) && value !== "" && value !== false)
    .map(([key, value]) => `${filterSummaryLabels[key] || key}: ${value === true ? "เปิด" : value}`);
}

export function mergeItems(a: Item[], b: Item[]) {
  const map = new Map<string, Item>();
  [...a, ...b].forEach((item) => map.set(item.id, item));
  return [...map.values()];
}

export function uniqueOwners(items: Item[]) {
  const map = new Map<string, User>();
  items.forEach((item) => {
    if (!map.has(item.owner.id)) {
      map.set(item.owner.id, {
        id: item.owner.id,
        email: "",
        display_name: item.owner.name,
        avatar_url: item.owner.avatar_url,
        is_featured: item.is_featured,
        is_fast_responder: item.is_fast_responder,
        account_level: item.owner.account_level
      });
    }
  });
  return [...map.values()];
}

export function bestMyItem(myItems: Item[], target: Item, index: number) {
  if (!myItems.length) return null;
  return (
    myItems.find((item) =>
      item.wanted.tags.some(
        (tag) => target.title.toLowerCase().includes(tag.toLowerCase()) || target.wanted.tags.includes(tag)
      )
    ) || myItems[index % myItems.length]
  );
}
