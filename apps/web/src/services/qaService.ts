import { ApiError, api } from "../lib/api";
import type { Item, RewardItem, User } from "../lib/types";
import { chatService } from "./chatService";
import { creditService } from "./creditService";
import { feedService } from "./feedService";
import { followService } from "./followService";
import { itemService } from "./itemService";
import { mediaService } from "./mediaService";
import { notificationService } from "./notificationService";
import { profileService } from "./profileService";
import { reportService } from "./reportService";
import { rewardService } from "./rewardService";
import { savedItemService } from "./savedItemService";
import { swapService } from "./swapService";
import { userService } from "./userService";
import { wantedItemService } from "./wantedItemService";

export type QaChecklistLink = {
  label: string;
  href: string;
};

export type QaChecklistResult = {
  id: string;
  action: string;
  services: string[];
  input: Record<string, unknown>;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
  link?: QaChecklistLink;
  details?: Record<string, unknown>;
  sessionUser?: User | null;
};

export type QaChecklistTest = {
  id: string;
  label: string;
  description: string;
  services: string[];
  run: () => Promise<QaChecklistResult>;
};

const QA_EMAIL = "qa.runner@qxwap.app";
const QA_PASSWORD = "password123";
const SEED_USERS = [
  { username: "mali", email: "mali@qxwap.app" },
  { username: "niran", email: "niran@qxwap.app" },
  { username: "ploy", email: "ploy@qxwap.app" }
] as const;

type QaBaseline = {
  qaUser: User;
  seedProfiles: User[];
  seedProfileMap: Record<string, User>;
  seedItems: Item[];
  rewards: RewardItem[];
};

function nowStamp() {
  return new Date().toISOString();
}

function uniqueSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSvgFile(label: string) {
  const shortLabel = label.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 18) || "QXwap";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640" fill="none">
      <rect width="640" height="640" rx="72" fill="#F7E9D7"/>
      <rect x="56" y="56" width="528" height="528" rx="48" fill="#101322"/>
      <circle cx="216" cy="224" r="88" fill="#FF8C45"/>
      <circle cx="424" cy="224" r="88" fill="#2C7A7B"/>
      <rect x="140" y="360" width="360" height="96" rx="28" fill="#F4F5F7"/>
      <text x="320" y="412" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="700" fill="#101322">${shortLabel}</text>
    </svg>
  `.trim();
  return new File([svg], `qa-${uniqueSuffix()}.svg`, { type: "image/svg+xml" });
}

function summarizeError(error: unknown) {
  if (error instanceof ApiError) {
    return error.code ? `${error.code}: ${error.message}` : error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
}

function createResult(params: QaChecklistResult) {
  return params;
}

function createFailureResult(
  id: string,
  action: string,
  services: string[],
  input: Record<string, unknown>,
  expected: string,
  error: unknown,
  link?: QaChecklistLink,
  details?: Record<string, unknown>
) {
  return createResult({
    id,
    action,
    services,
    input,
    expected,
    actual: "ทดสอบไม่ผ่าน",
    passed: false,
    error: summarizeError(error),
    link,
    details
  });
}

async function devResetSeedData() {
  await api<{ ok: true }>("/dev/seed/reset", {
    method: "POST",
    body: JSON.stringify({})
  });
}

async function devBootstrapQaRunner() {
  const response = await api<{ user: User }>("/dev/session/bootstrap-qa", {
    method: "POST",
    body: JSON.stringify({})
  });
  return response.user;
}

async function devLoginAs(email: string) {
  const response = await api<{ user: User }>("/dev/session/login", {
    method: "POST",
    body: JSON.stringify({ email })
  });
  return response.user;
}

async function devExpireOffer(offerId: string) {
  await api<{ ok: true }>(`/dev/offers/${offerId}/expire`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

async function resetAndBootstrapQaRunner() {
  await devResetSeedData();
  return await devBootstrapQaRunner();
}

async function signInQaRunner() {
  try {
    return await devLoginAs(QA_EMAIL);
  } catch {
    try {
      return await userService.signIn({
        email: QA_EMAIL,
        password: QA_PASSWORD
      });
    } catch {
      return await devBootstrapQaRunner();
    }
  }
}

async function prepareBaseline(): Promise<QaBaseline> {
  const qaUser = await resetAndBootstrapQaRunner();
  const [profiles, seedItems, rewards] = await Promise.all([
    profileService.listProfiles(),
    itemService.listItems({ limit: 60 }),
    rewardService.listRewards({ includeInactive: true })
  ]);
  const seedProfiles = profiles.filter((profile) => SEED_USERS.some((seed) => seed.username === profile.username));
  const seedProfileMap = Object.fromEntries(seedProfiles.map((profile) => [profile.username || profile.id, profile])) as Record<string, User>;
  return {
    qaUser,
    seedProfiles,
    seedProfileMap,
    seedItems: seedItems.items,
    rewards
  };
}

function requireSeedProfile(seedProfileMap: Record<string, User>, username: (typeof SEED_USERS)[number]["username"]) {
  const profile = seedProfileMap[username];
  if (!profile) throw new Error(`ไม่พบ seed profile ของ ${username}`);
  return profile;
}

function seedEmailForUsername(username?: string | null) {
  const match = SEED_USERS.find((seed) => seed.username === username);
  if (!match) throw new Error(`ไม่พบอีเมล seed สำหรับ ${username || "unknown"}`);
  return match.email;
}

function findActiveTargetItem(items: Item[], ownerId?: string) {
  const match = items.find((item) => item.status === "active" && (!ownerId || item.owner.id === ownerId));
  if (!match) throw new Error("ไม่พบ item active สำหรับใช้ใน QA");
  return match;
}

function findAvailableReward(rewards: RewardItem[], predicate: (reward: RewardItem) => boolean) {
  const match = rewards.find(predicate);
  if (!match) throw new Error("ไม่พบ reward ที่ตรงเงื่อนไข");
  return match;
}

async function uploadQaImage(label: string) {
  const file = buildSvgFile(label);
  const urls = await mediaService.uploadImages([file]);
  if (!urls.length) throw new Error("อัปโหลดภาพสำหรับ QA ไม่สำเร็จ");
  return urls;
}

async function createQaItem(label: string, options: { status?: "active" | "inactive"; wantedText?: string } = {}) {
  const suffix = uniqueSuffix();
  const images = await uploadQaImage(label);
  return await itemService.createItem(
    {
      title: `${label} ${suffix}`,
      description: `${label} สำหรับทดสอบ flow QA checklist`,
      category: "Electronics",
      condition: "Good",
      deal_type: "swap",
      status: options.status || "active",
      price_cash: 0,
      price_cash_unknown: true,
      price_credit: 0,
      open_to_offers: true,
      wanted_text: options.wantedText || "ต้องการแลกกับของใช้งานได้จริง",
      wanted_tags: ["qa", "checklist", suffix],
      location_label: "อารีย์, กรุงเทพฯ",
      latitude: 13.7797,
      longitude: 100.5447,
      images
    },
    `qa-item-${suffix}`
  );
}

async function createQaWantedItem(label: string) {
  const suffix = uniqueSuffix();
  const referenceImages = await uploadQaImage(label);
  return await wantedItemService.createWantedItem({
    title: `${label} ${suffix}`,
    description: `ต้องการ ${label} สำหรับทดสอบ QA checklist พร้อมรายละเอียดชัดเจน`,
    category: "Electronics",
    deal_type: "buy",
    wanted_text: "ขอสภาพใช้งานได้จริง พร้อมอุปกรณ์หลัก",
    wanted_tags: ["qa", "wanted", suffix],
    reference_images: referenceImages,
    urgency: "normal",
    status: "active",
    location_label: "ลาดพร้าว, กรุงเทพฯ",
    latitude: 13.8100,
    longitude: 100.5620
  });
}

async function createSwapFixture() {
  const baseline = await prepareBaseline();
  const ownerProfile = requireSeedProfile(baseline.seedProfileMap, "mali");
  const targetItem = findActiveTargetItem(baseline.seedItems, ownerProfile.id);
  const myItem = await createQaItem("QA Swap Offer");
  const created = await swapService.createSwapRequest({
    target_item_id: targetItem.id,
    item_ids: [myItem.id],
    message: `QA swap request ${uniqueSuffix()}`
  });
  return {
    ...baseline,
    ownerProfile,
    targetItem,
    myItem,
    offerId: created.offer_id,
    conversationId: created.conversation_id
  };
}

async function acceptSwapAsOwner(offerId: string, ownerProfile: User) {
  await devLoginAs(seedEmailForUsername(ownerProfile.username));
  await swapService.acceptSwapRequest(offerId);
  return await swapService.getOfferDetail(offerId);
}

async function rejectSwapAsOwner(offerId: string, ownerProfile: User) {
  await devLoginAs(seedEmailForUsername(ownerProfile.username));
  await swapService.rejectSwapRequest(offerId, "qa_reject");
  return await swapService.getOfferDetail(offerId);
}

async function counterSwapAsOwner(offerId: string, ownerProfile: User) {
  await devLoginAs(seedEmailForUsername(ownerProfile.username));
  await swapService.counterSwapRequest(offerId, {
    message: "ขอเพิ่มเงื่อนไขเล็กน้อยสำหรับ QA",
    cash_amount: 200
  });
  return await swapService.getOfferDetail(offerId);
}

async function completeSwapFixture() {
  const fixture = await createSwapFixture();
  await acceptSwapAsOwner(fixture.offerId, fixture.ownerProfile);
  await devLoginAs(seedEmailForUsername(fixture.ownerProfile.username));
  const startedShipment = await swapService.startShipment(fixture.offerId, {
    shipping_method: "meetup",
    meetup_location: "QXwap QA Lab",
    meetup_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    meetup_note: "นัดทดสอบ flow QA",
    pickup_window: "วันนี้ช่วงบ่าย"
  });
  await signInQaRunner();
  await swapService.updateSwapLogistics(fixture.offerId, {
    schedule_confirmations: {
      [fixture.qaUser.id]: new Date().toISOString()
    }
  });
  await devLoginAs(seedEmailForUsername(fixture.ownerProfile.username));
  await swapService.updateShipmentStep(startedShipment.shipment.id, { current_step: "picked_up" });
  await swapService.updateShipmentStep(startedShipment.shipment.id, { current_step: "in_transit" });
  await swapService.finishShipment(startedShipment.shipment.id);
  await signInQaRunner();
  await swapService.confirmSwapReceipt(fixture.offerId);
  await devLoginAs(seedEmailForUsername(fixture.ownerProfile.username));
  const completion = await swapService.confirmSwapReceipt(fixture.offerId);
  const detail = await swapService.getOfferDetail(fixture.offerId);
  await signInQaRunner();
  return {
    ...fixture,
    completion,
    detail,
    shipmentId: startedShipment.shipment.id
  };
}

async function runResetSeedDataTest() {
  const id = "reset-seed-data";
  try {
    const user = await resetAndBootstrapQaRunner();
    const [feed, notifications, wallet] = await Promise.all([
      feedService.getFollowingFeed({ limit: 10 }),
      notificationService.getUnreadCount(),
      creditService.getWallet()
    ]);
    return createResult({
      id,
      action: "ล้างฐานข้อมูล dev, seed ข้อมูลใหม่ และ bootstrap QA runner",
      services: ["qaService", "userService", "feedService", "notificationService", "creditService"],
      input: { endpoint: "/api/dev/seed/reset", bootstrap_user: QA_EMAIL },
      expected: "seed reset สำเร็จ, QA runner ถูกล็อกอิน, state เริ่มต้นอ่านได้จาก service จริง",
      actual: `reset สำเร็จและ QA runner พร้อมใช้งาน`,
      passed: Boolean(user?.id),
      link: { label: "เปิดหน้าโปรไฟล์ของ QA runner", href: "/profile" },
      details: {
        user_id: user.id,
        unread_count: notifications,
        feed_items: feed.items.length,
        credit_balance: wallet.credit_balance
      },
      sessionUser: user
    });
  } catch (error) {
    return createFailureResult(id, "ล้าง seed data", ["qaService"], { endpoint: "/api/dev/seed/reset" }, "seed reset และ bootstrap QA runner ต้องสำเร็จ", error);
  }
}

async function runFeedSuccessTest() {
  const id = "feed-success";
  const baseline = await prepareBaseline();
  const followTarget = requireSeedProfile(baseline.seedProfileMap, "mali");
  try {
    await followService.followUser(followTarget.id);
    const feed = await feedService.getFollowingFeed({ limit: 12 });
    const allOwnersFollowed = feed.items.every((item) => item.owner.id === followTarget.id);
    return createResult({
      id,
      action: "ติดตามผู้ใช้ 1 คน แล้วดึง feed ที่อิง follows",
      services: ["followService", "feedService"],
      input: { follow_user_id: followTarget.id, limit: 12 },
      expected: "feed ต้องมีโพสต์จากคนที่ follow เท่านั้น",
      actual: `ได้ feed ${feed.items.length} รายการจาก ${followTarget.display_name || followTarget.username}`,
      passed: feed.items.length > 0 && allOwnersFollowed,
      link: { label: "เปิดหน้าแรก", href: "/" },
      details: {
        owner_ids: [...new Set(feed.items.map((item) => item.owner.id))],
        item_ids: feed.items.map((item) => item.id)
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "ทดสอบ feed success", ["followService", "feedService"], { follow_user: followTarget.username }, "feed ต้องมีรายการจากคนที่ follow", error, { label: "เปิดหน้าแรก", href: "/" });
  }
}

async function runFeedEmptyNoFollowingTest() {
  const id = "feed-empty-no-following";
  try {
    const baseline = await prepareBaseline();
    const feed = await feedService.getFollowingFeed({ limit: 12 });
    return createResult({
      id,
      action: "ดึง feed ตอนยังไม่ได้ follow ใคร",
      services: ["feedService"],
      input: { limit: 12 },
      expected: "feed ต้องว่างเพราะไม่มี following",
      actual: `feed มี ${feed.items.length} รายการ`,
      passed: feed.items.length === 0,
      link: { label: "เปิดหน้าแรก", href: "/" },
      details: {
        feed_items: feed.items.length
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "ทดสอบ feed empty", ["feedService"], { reason: "no following" }, "feed ต้องว่างตอนยังไม่ follow ใคร", error, { label: "เปิดหน้าแรก", href: "/" });
  }
}

async function runFollowUserTest() {
  const id = "follow-user";
  const baseline = await prepareBaseline();
  const followTarget = requireSeedProfile(baseline.seedProfileMap, "mali");
  try {
    await followService.followUser(followTarget.id);
    const following = await followService.listFollowing();
    return createResult({
      id,
      action: "follow user",
      services: ["followService"],
      input: { follow_user_id: followTarget.id },
      expected: "รายการ following และ count ต้องอัปเดตจาก database",
      actual: `following เพิ่มเป็น ${following.length} คน`,
      passed: following.some((entry) => entry.id === followTarget.id),
      link: { label: "เปิดโปรไฟล์สาธารณะ", href: `/profile/${followTarget.id}` },
      details: {
        following_ids: following.map((entry) => entry.id)
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "follow user", ["followService"], { follow_user: followTarget.username }, "following ต้องเพิ่มจริง", error, { label: "เปิดโปรไฟล์สาธารณะ", href: `/profile/${followTarget.id}` });
  }
}

async function runUnfollowUserTest() {
  const id = "unfollow-user";
  const baseline = await prepareBaseline();
  const followTarget = requireSeedProfile(baseline.seedProfileMap, "mali");
  try {
    await followService.followUser(followTarget.id);
    await followService.unfollowUser(followTarget.id);
    const following = await followService.listFollowing();
    return createResult({
      id,
      action: "unfollow user",
      services: ["followService"],
      input: { unfollow_user_id: followTarget.id },
      expected: "รายการ following ต้องหายไปจาก database",
      actual: `following คงเหลือ ${following.length} คน`,
      passed: !following.some((entry) => entry.id === followTarget.id),
      link: { label: "เปิดโปรไฟล์สาธารณะ", href: `/profile/${followTarget.id}` },
      details: {
        following_ids: following.map((entry) => entry.id)
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "unfollow user", ["followService"], { user: followTarget.username }, "following ต้องถูกลบจริง", error, { label: "เปิดโปรไฟล์สาธารณะ", href: `/profile/${followTarget.id}` });
  }
}

async function runSearchItemSuccessTest() {
  const id = "search-item-success";
  try {
    const baseline = await prepareBaseline();
    const result = await itemService.searchItems({ category: "Electronics", limit: 10, sort: "newest" });
    return createResult({
      id,
      action: "ค้นหา item ตาม category/sort",
      services: ["itemService"],
      input: { category: "Electronics", sort: "newest", limit: 10 },
      expected: "search ต้องคืน item จาก service/database จริง",
      actual: `ค้นเจอ ${result.items.length} รายการ`,
      passed: result.items.length > 0,
      link: { label: "เปิด Explore", href: "/explore?category=Electronics&sort=newest" },
      details: {
        item_ids: result.items.map((item) => item.id),
        categories: [...new Set(result.items.map((item) => item.category))]
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "search item success", ["itemService"], { category: "Electronics", sort: "newest" }, "ต้องมีผลลัพธ์อย่างน้อย 1 รายการ", error, { label: "เปิด Explore", href: "/explore" });
  }
}

async function runSearchItemEmptyTest() {
  const id = "search-item-empty";
  try {
    const baseline = await prepareBaseline();
    const query = `qa-missing-${uniqueSuffix()}`;
    const result = await itemService.searchItems({ q: query, limit: 10 });
    return createResult({
      id,
      action: "ค้นหา item ด้วยคำค้นที่ไม่มีผลลัพธ์",
      services: ["itemService"],
      input: { q: query, limit: 10 },
      expected: "search ต้องคืนผลลัพธ์ว่างจริง",
      actual: `ค้นเจอ ${result.items.length} รายการ`,
      passed: result.items.length === 0,
      link: { label: "เปิด Explore", href: `/explore?q=${encodeURIComponent(query)}` },
      details: {
        query
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "search item empty", ["itemService"], { mode: "empty" }, "ผลลัพธ์ต้องเป็น 0", error, { label: "เปิด Explore", href: "/explore" });
  }
}

async function runCreateItemTest() {
  const id = "create-item";
  try {
    const baseline = await prepareBaseline();
    const item = await createQaItem("QA Checklist Item");
    const detail = await itemService.getItemDetail(item.id);
    return createResult({
      id,
      action: "สร้าง item ใหม่พร้อมรูปผ่าน service",
      services: ["mediaService", "itemService"],
      input: { title_prefix: "QA Checklist Item", category: "Electronics", condition: "Good" },
      expected: "item ต้องถูกสร้างและอ่านกลับจาก detail ได้จริง",
      actual: `สร้าง item ${detail.item.title}`,
      passed: detail.item.id === item.id && detail.item.media.images.length > 0,
      link: { label: "เปิด item detail", href: `/items/${item.id}` },
      details: {
        item_id: item.id,
        image_count: detail.item.media.images.length
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "create item", ["mediaService", "itemService"], { requires_image: true }, "item ใหม่ต้องถูกสร้างและมีรูปอย่างน้อย 1 รูป", error, { label: "เปิด post", href: "/post" });
  }
}

async function runCreateWantedItemTest() {
  const id = "create-wanted-item";
  try {
    const baseline = await prepareBaseline();
    const wantedItem = await createQaWantedItem("QA Wanted Item");
    const fetched = await wantedItemService.getWantedItem(wantedItem.id);
    return createResult({
      id,
      action: "สร้าง wanted item ใหม่",
      services: ["mediaService", "wantedItemService"],
      input: { title_prefix: "QA Wanted Item", urgency: "normal" },
      expected: "wanted item ต้องถูกสร้างและอ่านกลับได้จริง",
      actual: `สร้าง wanted item ${fetched.title}`,
      passed: fetched.id === wantedItem.id,
      link: { label: "เปิดโปรไฟล์ของฉัน", href: "/profile" },
      details: {
        wanted_item_id: wantedItem.id,
        reference_images: fetched.reference_images.length
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "create wanted item", ["mediaService", "wantedItemService"], { requires_description: true }, "wanted item ต้องถูกสร้างจริง", error, { label: "เปิด post wanted", href: "/post?kind=wanted" });
  }
}

async function runSaveItemTest() {
  const id = "save-item";
  const baseline = await prepareBaseline();
  const targetItem = findActiveTargetItem(baseline.seedItems);
  try {
    await savedItemService.saveItem(targetItem.id);
    const saved = await savedItemService.listSavedItems({ limit: 20 });
    return createResult({
      id,
      action: "save item",
      services: ["savedItemService"],
      input: { item_id: targetItem.id },
      expected: "saved item ต้องไปอยู่ใน saved_items จริง",
      actual: `saved items ตอนนี้ ${saved.items.length} รายการ`,
      passed: saved.items.some((item) => item.id === targetItem.id),
      link: { label: "เปิด Saved items", href: "/saved" },
      details: {
        saved_item_ids: saved.items.map((item) => item.id)
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "save item", ["savedItemService"], { item_id: targetItem.id }, "saved items ต้องมี item นี้", error, { label: "เปิด Saved items", href: "/saved" });
  }
}

async function runUnsaveItemTest() {
  const id = "unsave-item";
  const baseline = await prepareBaseline();
  const targetItem = findActiveTargetItem(baseline.seedItems);
  try {
    await savedItemService.saveItem(targetItem.id);
    await savedItemService.unsaveItem(targetItem.id);
    const saved = await savedItemService.listSavedItems({ limit: 20 });
    return createResult({
      id,
      action: "unsave item",
      services: ["savedItemService"],
      input: { item_id: targetItem.id },
      expected: "item ต้องถูกลบออกจาก saved_items จริง",
      actual: `saved items ตอนนี้ ${saved.items.length} รายการ`,
      passed: !saved.items.some((item) => item.id === targetItem.id),
      link: { label: "เปิด Saved items", href: "/saved" },
      details: {
        saved_item_ids: saved.items.map((item) => item.id)
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "unsave item", ["savedItemService"], { item_id: targetItem.id }, "item ต้องหายจาก saved list", error, { label: "เปิด Saved items", href: "/saved" });
  }
}

async function runCreateSwapRequestTest() {
  const id = "create-swap-request";
  try {
    const fixture = await createSwapFixture();
    const detail = await swapService.getOfferDetail(fixture.offerId);
    return createResult({
      id,
      action: "สร้าง swap request จาก item ของตัวเองไปยัง item เป้าหมาย",
      services: ["itemService", "swapService", "chatService"],
      input: {
        target_item_id: fixture.targetItem.id,
        offered_item_id: fixture.myItem.id
      },
      expected: "swap request ต้องถูกสร้างเป็น pending พร้อม conversation เดียวกัน",
      actual: `สร้าง offer ${fixture.offerId} สถานะ ${detail.offer.status}`,
      passed: detail.offer.status === "pending" && Boolean(detail.conversation_id),
      link: { label: "เปิด swap detail", href: `/swap/${fixture.offerId}` },
      details: {
        offer_id: fixture.offerId,
        conversation_id: detail.conversation_id
      },
      sessionUser: fixture.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "create swap request", ["itemService", "swapService"], { flow: "item detail -> create swap" }, "offer ต้องถูกสร้างเป็น pending", error, { label: "เปิดหน้าแรก", href: "/" });
  }
}

async function runAcceptSwapRequestTest() {
  const id = "accept-swap-request";
  let qaUser: User | null = null;
  try {
    const fixture = await createSwapFixture();
    qaUser = fixture.qaUser;
    const detail = await acceptSwapAsOwner(fixture.offerId, fixture.ownerProfile);
    await signInQaRunner();
    return createResult({
      id,
      action: "เจ้าของ item accept swap request",
      services: ["swapService"],
      input: { offer_id: fixture.offerId, owner_id: fixture.ownerProfile.id },
      expected: "offer ต้องเปลี่ยนเป็น accepted",
      actual: `offer สถานะ ${detail.offer.status}`,
      passed: detail.offer.status === "accepted",
      link: { label: "เปิด swap detail", href: `/swap/${fixture.offerId}` },
      details: {
        offer_id: fixture.offerId,
        status: detail.offer.status
      },
      sessionUser: qaUser
    });
  } catch (error) {
    await signInQaRunner().catch(() => undefined);
    return createFailureResult(id, "accept swap request", ["swapService"], {}, "offer ต้องเป็น accepted", error, { label: "เปิดดีล", href: "/deals" }, undefined);
  }
}

async function runRejectSwapRequestTest() {
  const id = "reject-swap-request";
  let qaUser: User | null = null;
  try {
    const fixture = await createSwapFixture();
    qaUser = fixture.qaUser;
    const detail = await rejectSwapAsOwner(fixture.offerId, fixture.ownerProfile);
    await signInQaRunner();
    return createResult({
      id,
      action: "เจ้าของ item reject swap request",
      services: ["swapService"],
      input: { offer_id: fixture.offerId },
      expected: "offer ต้องเปลี่ยนเป็น rejected",
      actual: `offer สถานะ ${detail.offer.status}`,
      passed: detail.offer.status === "rejected",
      link: { label: "เปิด swap detail", href: `/swap/${fixture.offerId}` },
      details: {
        rejection_reason: detail.offer.rejection_reason
      },
      sessionUser: qaUser
    });
  } catch (error) {
    await signInQaRunner().catch(() => undefined);
    return createFailureResult(id, "reject swap request", ["swapService"], {}, "offer ต้องเป็น rejected", error, { label: "เปิดดีล", href: "/deals" });
  }
}

async function runCounterOfferTest() {
  const id = "counter-offer";
  let qaUser: User | null = null;
  try {
    const fixture = await createSwapFixture();
    qaUser = fixture.qaUser;
    const detail = await counterSwapAsOwner(fixture.offerId, fixture.ownerProfile);
    await signInQaRunner();
    return createResult({
      id,
      action: "เจ้าของ item ส่ง counter offer",
      services: ["swapService"],
      input: { offer_id: fixture.offerId, cash_amount: 200 },
      expected: "offer ต้องเปลี่ยนเป็น countered พร้อมเก็บ counter offer metadata",
      actual: `offer สถานะ ${detail.offer.status}`,
      passed: detail.offer.status === "countered" && Boolean(detail.offer.logistics?.counter_offer),
      link: { label: "เปิด swap detail", href: `/swap/${fixture.offerId}` },
      details: {
        counter_offer: detail.offer.logistics?.counter_offer || null
      },
      sessionUser: qaUser
    });
  } catch (error) {
    await signInQaRunner().catch(() => undefined);
    return createFailureResult(id, "counter offer", ["swapService"], {}, "offer ต้องเป็น countered", error, { label: "เปิดดีล", href: "/deals" });
  }
}

async function runSwapExpiredTest() {
  const id = "swap-expired";
  let qaUser: User | null = null;
  try {
    const fixture = await createSwapFixture();
    qaUser = fixture.qaUser;
    await devExpireOffer(fixture.offerId);
    const offer = await swapService.getOfferSummary(fixture.offerId);
    return createResult({
      id,
      action: "ทำให้ swap request หมดอายุแล้วอ่านสถานะอีกครั้ง",
      services: ["swapService", "qaService"],
      input: { offer_id: fixture.offerId, dev_endpoint: "/api/dev/offers/:id/expire" },
      expected: "offer ต้องเปลี่ยนเป็น expired ผ่าน state machine จริง",
      actual: `offer สถานะ ${offer.status}`,
      passed: offer.status === "expired",
      link: { label: "เปิด swap detail", href: `/swap/${fixture.offerId}` },
      details: {
        offer_id: fixture.offerId,
        status: offer.status
      },
      sessionUser: qaUser
    });
  } catch (error) {
    return createFailureResult(id, "expire swap request", ["swapService", "qaService"], {}, "offer ต้องเป็น expired", error, { label: "เปิดดีล", href: "/deals" });
  }
}

async function runSwapCancelledTest() {
  const id = "swap-cancelled";
  try {
    const fixture = await createSwapFixture();
    await swapService.cancelSwapRequest(fixture.offerId);
    const detail = await swapService.getOfferDetail(fixture.offerId);
    return createResult({
      id,
      action: "ผู้ขอแลกยกเลิกดีล",
      services: ["swapService"],
      input: { offer_id: fixture.offerId },
      expected: "offer ต้องเปลี่ยนเป็น cancelled พร้อม status log",
      actual: `offer สถานะ ${detail.offer.status}`,
      passed: detail.offer.status === "cancelled",
      link: { label: "เปิด swap detail", href: `/swap/${fixture.offerId}` },
      details: {
        offer_id: fixture.offerId,
        status: detail.offer.status
      },
      sessionUser: fixture.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "cancel swap request", ["swapService"], {}, "offer ต้องเป็น cancelled", error, { label: "เปิดดีล", href: "/deals" });
  }
}

async function runCompleteSwapTest() {
  const id = "complete-swap";
  let qaUser: User | null = null;
  try {
    const completed = await completeSwapFixture();
    qaUser = completed.qaUser;
    const targetAfter = await itemService.getItemDetail(completed.targetItem.id);
    const transactions = await creditService.getTransactions();
    const earnedTransaction = transactions.find((entry) => entry.type === "earn_swap_completed" && entry.source_id === completed.offerId);
    return createResult({
      id,
      action: "ทำ swap journey จน completed และตรวจเครดิต",
      services: ["swapService", "creditService", "itemService"],
      input: {
        offer_id: completed.offerId,
        target_item_id: completed.targetItem.id,
        offered_item_id: completed.myItem.id
      },
      expected: "offer ต้อง completed, item status ต้องเปลี่ยนตาม rule, และมี credit transaction",
      actual: `offer ปิดดีลสำเร็จเป็น ${completed.detail.offer.status}`,
      passed:
        completed.detail.offer.status === "completed" &&
        targetAfter.item.status === "swapped" &&
        Boolean(earnedTransaction),
      link: { label: "เปิด swap detail", href: `/swap/${completed.offerId}` },
      details: {
        offer_status: completed.detail.offer.status,
        target_item_status: targetAfter.item.status,
        earned_transaction_id: earnedTransaction?.id || null
      },
      sessionUser: qaUser
    });
  } catch (error) {
    await signInQaRunner().catch(() => undefined);
    return createFailureResult(id, "complete swap", ["swapService", "creditService", "itemService"], {}, "swap ต้อง completed และเกิดเครดิต", error, { label: "เปิดดีล", href: "/deals" });
  }
}

async function runCreditEarnedTest() {
  const id = "credit-earned";
  try {
    const baseline = await prepareBaseline();
    const walletBefore = await creditService.getWallet();
    const ruleSourceId = `qa-credit-${uniqueSuffix()}`;
    const result = await creditService.applyRule("profile_completed", ruleSourceId);
    const walletAfter = await creditService.getWallet();
    return createResult({
      id,
      action: "ให้เครดิตกิจกรรมผ่าน creditService.applyRule",
      services: ["creditService"],
      input: { rule_key: "profile_completed", source_id: ruleSourceId },
      expected: "wallet ต้องเพิ่มและมี transaction ใหม่",
      actual: `เครดิตเพิ่มจาก ${walletBefore.credit_balance} เป็น ${walletAfter.credit_balance}`,
      passed:
        Number(walletAfter.credit_balance) > Number(walletBefore.credit_balance) &&
        result.transaction?.type === "earn_activity_bonus",
      link: { label: "เปิดหน้าเครดิต", href: "/credits" },
      details: {
        transaction_id: result.transaction?.id || null,
        amount: result.transaction?.amount || null
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "credit earned", ["creditService"], { rule_key: "profile_completed" }, "wallet ต้องเพิ่มจริง", error, { label: "เปิดหน้าเครดิต", href: "/credits" });
  }
}

async function runRedeemRewardSuccessTest() {
  const id = "credit-redeem-success";
  let sessionUser: User | null = null;
  try {
    await prepareBaseline();
    sessionUser = await devLoginAs(seedEmailForUsername("mali"));
    const walletBefore = await creditService.getWallet();
    const rewards = await rewardService.listRewards({ includeInactive: true });
    const reward = findAvailableReward(rewards, (entry) => entry.availability_status === "available");
    const result = await rewardService.redeemReward(reward.id);
    await signInQaRunner();
    return createResult({
      id,
      action: "redeem reward ที่พร้อมแลก",
      services: ["rewardService", "creditService", "notificationService"],
      input: { reward_id: reward.id, credit_cost: reward.credit_cost },
      expected: "wallet ต้องลด, stock ต้องลด, redemption ต้องถูกสร้าง",
      actual: `แลกรางวัล ${reward.title} สำเร็จ`,
      passed:
        Number(result.wallet.credit_balance) === Number(walletBefore.credit_balance) - Number(reward.credit_cost) &&
        Boolean(result.redemption?.id) &&
        Number(result.reward?.inventory_count || 0) === Number(reward.inventory_count || 0) - 1,
      link: { label: "เปิดหน้าเครดิต", href: "/credits" },
      details: {
        redemption_id: result.redemption?.id || null,
        wallet_before: walletBefore.credit_balance,
        wallet_after: result.wallet.credit_balance,
        inventory_after: result.reward?.inventory_count
      },
      sessionUser: await signInQaRunner()
    });
  } catch (error) {
    await signInQaRunner().catch(() => undefined);
    return createFailureResult(id, "redeem reward success", ["rewardService", "creditService"], {}, "redeem ต้องลดเครดิตและ stock จริง", error, { label: "เปิดหน้าเครดิต", href: "/credits" });
  }
}

async function runRedeemInsufficientTest() {
  const id = "credit-redeem-insufficient";
  try {
    const baseline = await prepareBaseline();
    const rewards = await rewardService.listRewards({ includeInactive: true });
    const reward = findAvailableReward(rewards, (entry) => entry.availability_status === "available" && entry.credit_cost > 100);
    try {
      await rewardService.redeemReward(reward.id);
      throw new Error("ระบบควรตอบ insufficient credit แต่แลกสำเร็จ");
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "INSUFFICIENT_CREDIT") throw error;
      return createResult({
        id,
        action: "redeem reward ตอนเครดิตไม่พอ",
        services: ["rewardService", "creditService"],
        input: { reward_id: reward.id, credit_cost: reward.credit_cost },
        expected: "ต้องถูกปฏิเสธด้วย insufficient credit",
        actual: `ระบบตอบ ${error.code}`,
        passed: true,
        link: { label: "เปิดหน้าเครดิต", href: "/credits" },
        details: {
          error_code: error.code,
          reward_title: reward.title
        },
        sessionUser: baseline.qaUser
      });
    }
  } catch (error) {
    return createFailureResult(id, "redeem insufficient credit", ["rewardService", "creditService"], {}, "ระบบต้องบล็อกการแลกเมื่อเครดิตไม่พอ", error, { label: "เปิดหน้าเครดิต", href: "/credits" });
  }
}

async function runRewardOutOfStockTest() {
  const id = "reward-out-of-stock";
  try {
    const baseline = await prepareBaseline();
    const rewards = await rewardService.listRewards({ includeInactive: true });
    const reward = findAvailableReward(rewards, (entry) => entry.availability_status === "out_of_stock");
    try {
      await rewardService.redeemReward(reward.id);
      throw new Error("ระบบควรตอบ out of stock แต่แลกสำเร็จ");
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "OUT_OF_STOCK") throw error;
      return createResult({
        id,
        action: "redeem reward ที่ stock หมด",
        services: ["rewardService"],
        input: { reward_id: reward.id },
        expected: "ต้องถูกปฏิเสธด้วย out_of_stock",
        actual: `ระบบตอบ ${error.code}`,
        passed: true,
        link: { label: "เปิดหน้าเครดิต", href: "/credits" },
        details: {
          reward_title: reward.title,
          inventory_count: reward.inventory_count
        },
        sessionUser: baseline.qaUser
      });
    }
  } catch (error) {
    return createFailureResult(id, "reward out of stock", ["rewardService"], {}, "ระบบต้องบล็อกของรางวัลหมด stock", error, { label: "เปิดหน้าเครดิต", href: "/credits" });
  }
}

async function runSendChatMessageTest() {
  const id = "send-chat-message";
  try {
    const fixture = await createSwapFixture();
    const conversationId = fixture.conversationId || await chatService.createThreadFromSwap(fixture.offerId);
    const messageText = `QA chat message ${uniqueSuffix()}`;
    const sent = await chatService.sendMessage(conversationId, messageText);
    const messages = await chatService.getMessages(conversationId);
    return createResult({
      id,
      action: "ส่งข้อความใน chat thread ของ swap",
      services: ["chatService"],
      input: { conversation_id: conversationId, text: messageText },
      expected: "message ต้องถูกบันทึกจริงและอ่านกลับได้หลัง reload",
      actual: `ส่งข้อความสำเร็จใน conversation ${conversationId}`,
      passed: messages.some((entry) => entry.id === sent.id && entry.text === messageText),
      link: { label: "เปิดแชต", href: `/chats/${conversationId}` },
      details: {
        message_id: sent.id,
        message_count: messages.length
      },
      sessionUser: fixture.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "send chat message", ["chatService"], {}, "message ต้องถูกส่งและอ่านกลับได้", error, { label: "เปิดแชต", href: "/chats" });
  }
}

async function runNotificationZeroTest() {
  const id = "notification-count-zero";
  try {
    const baseline = await prepareBaseline();
    await notificationService.markAllRead();
    const unreadCount = await notificationService.getUnreadCount();
    return createResult({
      id,
      action: "mark all notifications as read",
      services: ["notificationService"],
      input: { action: "markAllRead" },
      expected: "unread count ต้องเป็น 0 หลัง reload",
      actual: `unread count = ${unreadCount}`,
      passed: unreadCount === 0,
      link: { label: "เปิด Notifications", href: "/notifications" },
      details: {
        unread_count: unreadCount
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "notification count zero", ["notificationService"], {}, "unread count ต้องเป็น 0", error, { label: "เปิด Notifications", href: "/notifications" });
  }
}

async function runNotificationPositiveTest() {
  const id = "notification-count-positive";
  try {
    const baseline = await prepareBaseline();
    const unreadCount = await notificationService.getUnreadCount();
    return createResult({
      id,
      action: "อ่าน unread notification count จาก service หลัง bootstrap",
      services: ["notificationService"],
      input: { source: "signup bonus / credit notification" },
      expected: "unread count ต้องมากกว่า 0",
      actual: `unread count = ${unreadCount}`,
      passed: unreadCount > 0,
      link: { label: "เปิด Notifications", href: "/notifications" },
      details: {
        unread_count: unreadCount
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "notification count positive", ["notificationService"], {}, "unread count ต้องมากกว่า 0", error, { label: "เปิด Notifications", href: "/notifications" });
  }
}

async function runReportItemTest() {
  const id = "report-item";
  try {
    const baseline = await prepareBaseline();
    const targetItem = findActiveTargetItem(baseline.seedItems);
    const report = await reportService.createReport({
      target_type: "item",
      target_id: targetItem.id,
      reason: "qa_item_report",
      description: "สร้างจาก QA checklist page"
    });
    return createResult({
      id,
      action: "รายงาน item ผ่าน reportService",
      services: ["reportService"],
      input: { target_type: "item", target_id: targetItem.id },
      expected: "report ต้องถูกสร้างจริงใน database",
      actual: `สร้าง report ${report.id}`,
      passed: report.target_id === targetItem.id && report.target_type === "item",
      link: { label: "เปิด item detail", href: `/items/${targetItem.id}` },
      details: {
        report_id: report.id,
        status: report.status
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "report item", ["reportService"], {}, "report ต้องถูกสร้างจริง", error, { label: "เปิดหน้า Explore", href: "/explore" });
  }
}

async function runOfflineErrorTest() {
  const id = "offline-error-state";
  try {
    const baseline = await prepareBaseline();
    try {
      const response = await api<{ simulated_error?: { code?: string; status?: number; message?: string } }>("/dev/error-state", {
        method: "GET"
      });
      const simulated = response.simulated_error;
      if (!simulated?.code) {
        throw new Error("ระบบควรตอบ simulated error state แต่ไม่พบ payload ที่คาดไว้");
      }
      throw new ApiError(
        simulated.message || "จำลอง error state ไม่สำเร็จ",
        Number(simulated.status || 503),
        simulated.code
      );
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "QA_SIMULATED_OFFLINE") throw error;
      return createResult({
        id,
        action: "จำลอง offline/error ผ่าน dev adapter endpoint",
        services: ["qaService"],
        input: { endpoint: "/api/dev/error-state" },
        expected: "service layer ต้องคืน error state จริงโดยไม่ปลอม UI state",
        actual: `adapter ตอบ ${error.code}`,
        passed: true,
        details: {
          status: error.status,
          code: error.code
        },
        sessionUser: baseline.qaUser
      });
    }
  } catch (error) {
    return createFailureResult(id, "offline/error state", ["qaService"], {}, "adapter ต้องคืน network error จริง", error);
  }
}

async function runPublicProfilePrivacyTest() {
  const id = "public-profile-privacy";
  try {
    const baseline = await prepareBaseline();
    const publicTarget = requireSeedProfile(baseline.seedProfileMap, "mali");
    const profile = await profileService.getProfile(publicTarget.id);
    const profileKeys = Object.keys(profile as Record<string, unknown>);
    const forbiddenKeys = ["credit_balance", "saved_items", "swap_history", "email"].filter((key) => key in (profile as Record<string, unknown>));
    return createResult({
      id,
      action: "โหลด public profile แล้วตรวจ field privacy",
      services: ["profileService"],
      input: { profile_id: publicTarget.id },
      expected: "public profile ต้องไม่เปิดเผย credit, saved items, swap history, email",
      actual: `public profile ส่งกลับ ${profileKeys.length} fields`,
      passed: forbiddenKeys.length === 0,
      link: { label: "เปิด public profile", href: `/profile/${publicTarget.id}` },
      details: {
        profile_keys: profileKeys,
        forbidden_keys: forbiddenKeys
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "public profile privacy", ["profileService"], {}, "public profile ต้องไม่เผยข้อมูลส่วนตัวเกินจำเป็น", error, { label: "เปิดโปรไฟล์", href: "/profile" });
  }
}

async function runOwnProfileCreditVisibilityTest() {
  const id = "own-profile-credit-visibility";
  try {
    const baseline = await prepareBaseline();
    const [profile, wallet, publicMirror] = await Promise.all([
      profileService.getCurrentProfile(),
      creditService.getWallet(),
      profileService.getProfile(baseline.qaUser.id)
    ]);
    const publicMirrorHasCredit = "credit_balance" in (publicMirror as Record<string, unknown>);
    return createResult({
      id,
      action: "โหลด own profile + wallet แล้วตรวจว่า credit เป็น owner-only",
      services: ["profileService", "creditService"],
      input: { current_user_id: baseline.qaUser.id },
      expected: "wallet ต้องอ่านได้เฉพาะ owner และ public profile route ต้องไม่ leak credit",
      actual: `own profile ${profile.username || profile.display_name} เห็นเครดิต ${wallet.credit_balance} QX Credit`,
      passed: Number(wallet.credit_balance) >= 0 && !publicMirrorHasCredit,
      link: { label: "เปิด own profile", href: "/profile" },
      details: {
        wallet_balance: wallet.credit_balance,
        public_profile_has_credit: publicMirrorHasCredit
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "own profile credit visibility", ["profileService", "creditService"], {}, "credit ต้องเป็น owner-only", error, { label: "เปิด own profile", href: "/profile" });
  }
}

async function runFollowAffectsFeedTest() {
  const id = "follow-affects-feed";
  try {
    const baseline = await prepareBaseline();
    const followTarget = requireSeedProfile(baseline.seedProfileMap, "mali");
    const before = await feedService.getFollowingFeed({ limit: 12 });
    await followService.followUser(followTarget.id);
    const afterFollow = await feedService.getFollowingFeed({ limit: 12 });
    await followService.unfollowUser(followTarget.id);
    const afterUnfollow = await feedService.getFollowingFeed({ limit: 12 });
    return createResult({
      id,
      action: "ตรวจว่า follow/unfollow เปลี่ยน feed source จริง",
      services: ["followService", "feedService"],
      input: { follow_user_id: followTarget.id },
      expected: "before = 0, after follow > 0, after unfollow = 0",
      actual: `before ${before.items.length} -> after follow ${afterFollow.items.length} -> after unfollow ${afterUnfollow.items.length}`,
      passed: before.items.length === 0 && afterFollow.items.length > 0 && afterUnfollow.items.length === 0,
      link: { label: "เปิดหน้าแรก", href: "/" },
      details: {
        before_count: before.items.length,
        after_follow_count: afterFollow.items.length,
        after_unfollow_count: afterUnfollow.items.length
      },
      sessionUser: baseline.qaUser
    });
  } catch (error) {
    return createFailureResult(id, "follow affects feed", ["followService", "feedService"], {}, "follow/unfollow ต้องเปลี่ยน feed จริง", error, { label: "เปิดหน้าแรก", href: "/" });
  }
}

export const qaService = {
  resetSeedData: runResetSeedDataTest,
  feedSuccess: runFeedSuccessTest,
  feedEmptyNoFollowing: runFeedEmptyNoFollowingTest,
  followUser: runFollowUserTest,
  unfollowUser: runUnfollowUserTest,
  searchItemSuccess: runSearchItemSuccessTest,
  searchItemEmpty: runSearchItemEmptyTest,
  createItem: runCreateItemTest,
  createWantedItem: runCreateWantedItemTest,
  saveItem: runSaveItemTest,
  unsaveItem: runUnsaveItemTest,
  createSwapRequest: runCreateSwapRequestTest,
  acceptSwapRequest: runAcceptSwapRequestTest,
  rejectSwapRequest: runRejectSwapRequestTest,
  counterOffer: runCounterOfferTest,
  swapExpired: runSwapExpiredTest,
  swapCancelled: runSwapCancelledTest,
  completeSwap: runCompleteSwapTest,
  creditEarned: runCreditEarnedTest,
  creditRedeemSuccess: runRedeemRewardSuccessTest,
  creditRedeemInsufficient: runRedeemInsufficientTest,
  rewardOutOfStock: runRewardOutOfStockTest,
  sendChatMessage: runSendChatMessageTest,
  notificationCountZero: runNotificationZeroTest,
  notificationCountPositive: runNotificationPositiveTest,
  reportItem: runReportItemTest,
  offlineErrorState: runOfflineErrorTest,
  publicProfilePrivacy: runPublicProfilePrivacyTest,
  ownProfileCreditVisibility: runOwnProfileCreditVisibilityTest,
  followAffectsFeed: runFollowAffectsFeedTest
};

export const qaChecklistTests: QaChecklistTest[] = [
  {
    id: "reset-seed-data",
    label: "Reset seed data",
    description: "ล้างข้อมูล dev แล้ว bootstrap QA runner ใหม่",
    services: ["qaService", "userService", "feedService", "creditService", "notificationService"],
    run: qaService.resetSeedData
  },
  {
    id: "feed-success",
    label: "Feed success",
    description: "follow 1 คนแล้วตรวจว่า feed มี item จากคนที่ติดตามจริง",
    services: ["followService", "feedService"],
    run: qaService.feedSuccess
  },
  {
    id: "feed-empty-no-following",
    label: "Feed empty because no following",
    description: "ตรวจ empty state ของ feed เมื่่อยังไม่ได้ติดตามใคร",
    services: ["feedService"],
    run: qaService.feedEmptyNoFollowing
  },
  {
    id: "follow-user",
    label: "Follow user",
    description: "ติดตามผู้ใช้และตรวจ count/list ที่เปลี่ยนจริง",
    services: ["followService"],
    run: qaService.followUser
  },
  {
    id: "unfollow-user",
    label: "Unfollow user",
    description: "ยกเลิกติดตามและตรวจ count/list ที่เปลี่ยนจริง",
    services: ["followService"],
    run: qaService.unfollowUser
  },
  {
    id: "search-item-success",
    label: "Search item success",
    description: "ค้นหา item ผ่าน service ด้วย filter จริง",
    services: ["itemService"],
    run: qaService.searchItemSuccess
  },
  {
    id: "search-item-empty",
    label: "Search item empty",
    description: "ค้นหาด้วยคำค้นที่ไม่มีผลลัพธ์",
    services: ["itemService"],
    run: qaService.searchItemEmpty
  },
  {
    id: "create-item",
    label: "Create item",
    description: "สร้าง item จริงพร้อมอัปโหลดรูปผ่าน media adapter",
    services: ["mediaService", "itemService"],
    run: qaService.createItem
  },
  {
    id: "create-wanted-item",
    label: "Create wanted item",
    description: "สร้าง wanted item จริงพร้อม reference image",
    services: ["mediaService", "wantedItemService"],
    run: qaService.createWantedItem
  },
  {
    id: "save-item",
    label: "Save item",
    description: "บันทึก item แล้วตรวจ saved list จาก database",
    services: ["savedItemService"],
    run: qaService.saveItem
  },
  {
    id: "unsave-item",
    label: "Unsave item",
    description: "ยกเลิกบันทึก item แล้วตรวจ saved list",
    services: ["savedItemService"],
    run: qaService.unsaveItem
  },
  {
    id: "create-swap-request",
    label: "Create swap request",
    description: "สร้างข้อเสนอแลกจริงจาก item ของตัวเอง",
    services: ["itemService", "swapService", "chatService"],
    run: qaService.createSwapRequest
  },
  {
    id: "accept-swap-request",
    label: "Accept swap request",
    description: "สลับ session ไปเจ้าของ item แล้วตอบรับข้อเสนอ",
    services: ["swapService"],
    run: qaService.acceptSwapRequest
  },
  {
    id: "reject-swap-request",
    label: "Reject swap request",
    description: "สลับ session ไปเจ้าของ item แล้วปฏิเสธข้อเสนอ",
    services: ["swapService"],
    run: qaService.rejectSwapRequest
  },
  {
    id: "counter-offer",
    label: "Counter offer",
    description: "สลับ session ไปเจ้าของ item แล้วส่งข้อเสนอโต้กลับ",
    services: ["swapService"],
    run: qaService.counterOffer
  },
  {
    id: "swap-expired",
    label: "Swap expired",
    description: "ตั้งข้อเสนอให้หมดอายุใน dev แล้วอ่านสถานะผ่าน swapService",
    services: ["swapService", "qaService"],
    run: qaService.swapExpired
  },
  {
    id: "swap-cancelled",
    label: "Swap cancelled",
    description: "ผู้ขอแลกยกเลิกดีลและตรวจ terminal state",
    services: ["swapService"],
    run: qaService.swapCancelled
  },
  {
    id: "complete-swap",
    label: "Complete swap",
    description: "ทำดีลจน completed และตรวจ credit/item status",
    services: ["swapService", "creditService", "itemService"],
    run: qaService.completeSwap
  },
  {
    id: "credit-earned",
    label: "Credit earned",
    description: "ให้เครดิตกิจกรรมผ่าน creditService.applyRule",
    services: ["creditService"],
    run: qaService.creditEarned
  },
  {
    id: "credit-redeem-success",
    label: "Credit redeem success",
    description: "แลกรางวัลสำเร็จและตรวจ balance/stock/history จริง",
    services: ["rewardService", "creditService", "notificationService"],
    run: qaService.creditRedeemSuccess
  },
  {
    id: "credit-redeem-insufficient",
    label: "Credit redeem insufficient balance",
    description: "ลองแลกรางวัลตอนเครดิตไม่พอ",
    services: ["rewardService", "creditService"],
    run: qaService.creditRedeemInsufficient
  },
  {
    id: "reward-out-of-stock",
    label: "Reward out of stock",
    description: "ลองแลกของรางวัลที่หมด stock แล้ว",
    services: ["rewardService"],
    run: qaService.rewardOutOfStock
  },
  {
    id: "send-chat-message",
    label: "Send chat message",
    description: "ส่งข้อความใน thread จริงและอ่านกลับหลังส่ง",
    services: ["chatService"],
    run: qaService.sendChatMessage
  },
  {
    id: "notification-count-zero",
    label: "Notification count 0",
    description: "mark all read แล้วตรวจ unread count",
    services: ["notificationService"],
    run: qaService.notificationCountZero
  },
  {
    id: "notification-count-positive",
    label: "Notification count > 0",
    description: "อ่าน unread count จาก notificationService จริง",
    services: ["notificationService"],
    run: qaService.notificationCountPositive
  },
  {
    id: "report-item",
    label: "Report item",
    description: "รายงาน item ผ่าน reportService",
    services: ["reportService"],
    run: qaService.reportItem
  },
  {
    id: "offline-error-state",
    label: "Offline/error state",
    description: "จำลอง network error ผ่าน data adapter ไม่ใช่ setState",
    services: ["qaService"],
    run: qaService.offlineErrorState
  },
  {
    id: "public-profile-privacy",
    label: "Public profile privacy check",
    description: "ตรวจว่า public profile ไม่เผยข้อมูลส่วนตัวเกินจำเป็น",
    services: ["profileService"],
    run: qaService.publicProfilePrivacy
  },
  {
    id: "own-profile-credit-visibility",
    label: "Own profile credit visibility check",
    description: "ตรวจว่า owner เห็นเครดิตผ่าน own flow เท่านั้น",
    services: ["profileService", "creditService"],
    run: qaService.ownProfileCreditVisibility
  },
  {
    id: "follow-affects-feed",
    label: "Follow affects feed check",
    description: "ตรวจว่าการ follow/unfollow เปลี่ยน feed source จริง",
    services: ["followService", "feedService"],
    run: qaService.followAffectsFeed
  }
];
