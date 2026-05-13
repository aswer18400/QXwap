import type { Filters } from "./constants";
import { conditionScores, filterSummaryLabels, wantedFallbacks } from "./constants";
import type { Item, User } from "./types";

export function conditionPercent(item: Item) {
  const found = String(item.condition || "").match(/\d+/)?.[0];
  return found ? Number(found) : conditionScores[item.condition] ?? 82;
}

export function profileLevel(profile?: User | null) {
  const level = Number(profile?.account_level ?? 0);
  if (level === 4) return { key: "level-4", label: "Level 4", title: "Restricted User", note: "ถูกจำกัดสิทธิ์ แลกไม่ได้ ดูได้เท่านั้น" };
  if (level === 3) return { key: "level-3", label: "Level 3", title: "Credit User", note: "สมัครเครดิตเพื่อชำระเงินแล้ว" };
  if (level === 2) return { key: "level-2", label: "Level 2", title: "QServeep User", note: "ใช้งานฟีเจอร์ QXwap ได้ครบ" };
  if (level === 1) return { key: "level-1", label: "Level 1", title: "Registered User", note: "ล็อกอินและใช้งานฟีเจอร์พื้นฐานได้" };
  return { key: "level-0", label: "Level 0", title: "Guest", note: "ยังไม่ได้เข้าสู่ระบบ" };
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
    .filter(([key, value]) => key !== "sort" && value !== "" && value !== false)
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
