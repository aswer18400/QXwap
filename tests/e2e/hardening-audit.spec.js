const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  createItem,
  createSignedInContext,
  waitForAppReady
} = require("./qxwap-test-helpers");

const stamp = Date.now();
const ownerEmail = "mali@qxwap.app";
const requesterEmail = "niran@qxwap.app";

let ownerState;
let requesterState;
let ownerItem;
let requesterItem;

test.describe.serial("QXwap hardening audit", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    const ownerApi = await createSignedInContext(ownerEmail);
    const requesterApi = await createSignedInContext(requesterEmail);

    ownerItem = await createItem(ownerApi, stamp, {
      title: `Owner target ${stamp}`,
      description: "รายการของ owner สำหรับทดสอบ detail และ inbox",
      category: "Electronics",
      wanted_text: "ต้องการแลก mechanical keyboard",
      wanted_tags: ["keyboard", "desk"]
    });

    requesterItem = await createItem(requesterApi, stamp, {
      title: `Requester offer ${stamp}`,
      description: "รายการของ requester สำหรับแนบในข้อเสนอ",
      category: "Home",
      wanted_text: "ต้องการแลกของแต่งโต๊ะ",
      wanted_tags: ["desk", "lamp"]
    });

    ownerState = await ownerApi.storageState();
    requesterState = await requesterApi.storageState();
  });

  test("guest can browse shop/detail and gets auth gate on Xwap", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/explore?sort=price_asc&nearby_radius_km=50`);
    await waitForAppReady(page);

    await expect(page.locator(".shop-sticky-shell")).toBeVisible();
    await expect(page.locator(".shop-toolbar")).toContainText(/ใกล้ฉัน|ในระยะ/);
    await expect(page.getByRole("navigation", { name: "เมนูหลัก" })).toBeVisible();

    await page.goto(`${WEB_BASE}/items/${ownerItem.id}`);
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: new RegExp(`แชร์ ${ownerItem.title}`) })).toBeVisible();
    await expect(page.getByRole("button", { name: /ขอแลก|เสนอการแลกเปลี่ยน/ })).toBeVisible();

    await page.getByRole("button", { name: /ขอแลก|เสนอการแลกเปลี่ยน/ }).click();
    await expect(page.locator('[role="dialog"]').first()).toBeVisible();
    await expect(page.getByText(/เข้าสู่ระบบเพื่อใช้งาน QXwap|เข้าสู่ QXwap/)).toBeVisible();
    await expect(page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true })).toBeVisible();

    await context.close();
  });

  test("shop recovery can reset empty results back to the full list", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/?view=shop&wanted_tag=zzzzzzzz-no-results&nearby_radius_km=50`);
    await waitForAppReady(page);

    await expect(page.getByText("ยังไม่เจอสินค้าในระยะนี้ ลองขยายระยะหรือดูสินค้าทั้งหมด")).toBeVisible();
    await page.getByRole("button", { name: "ดูสินค้าทั้งหมด" }).click();
    await page.waitForURL(/\/explore(?:$|\?)/, { timeout: 10000 });
    await expect(page.getByText("ยังไม่เจอสินค้าในระยะนี้ ลองขยายระยะหรือดูสินค้าทั้งหมด")).toHaveCount(0);
    await expect(page.locator(".shop-card").first()).toBeVisible();

    await context.close();
  });

  test("requester can open offer sheet, send Xwap, and enter sent journey", async ({ browser }) => {
    const context = await browser.newContext({ storageState: requesterState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/items/${ownerItem.id}`);
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    await page.getByRole("button", { name: /ขอแลก|เสนอการแลกเปลี่ยน/ }).click();
    await expect(page.getByRole("heading", { name: new RegExp(`Xwap: ${ownerItem.title}`) })).toBeVisible();

    await page.getByRole("button", { name: new RegExp(requesterItem.title) }).click();
    await page.getByLabel("ข้อความถึงเจ้าของสินค้า").fill("ขอแลกผ่าน UI smoke test");
    await page.getByRole("button", { name: "ส่ง Xwap" }).click();

    await page.waitForURL(/\/swap\//, { timeout: 15000 });
    await expect(page.getByRole("button", { name: "กลับไปหน้าข้อเสนอ" })).toBeVisible();
    await page.getByRole("button", { name: "แชท" }).click();
    await page.waitForURL(/\/chat[s]?\//, { timeout: 10000 });

    await page.goto(`${WEB_BASE}/deals?tab=sent`);
    await waitForAppReady(page);
    await expect(page.getByRole("tab", { name: /กำลังแลก/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".message-offer-card").first()).toBeVisible();
    await expect(page.locator(".message-offer-thumb").first()).toBeVisible();

    await context.close();
  });

  test("owner sees owner controls, can review the received offer, and sign out", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/items/${ownerItem.id}`);
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "แก้ไข" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Xwap$/ })).toHaveCount(0);

    await page.goto(`${WEB_BASE}/deals?tab=received`);
    await waitForAppReady(page);
    await expect(page.getByRole("tab", { name: /กำลังแลก/ })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".message-offer-card").first()).toBeVisible();

    await page.getByRole("button", { name: /ตอบรับหรือปฏิเสธ|ดูรายละเอียด/i }).first().click();
    await page.waitForURL(/\/swap\//, { timeout: 10000 });
    await expect(page.getByText("กำลังแลกอะไรกับอะไร")).toBeVisible();
    await expect(page.getByRole("button", { name: /กลับไปหน้าข้อเสนอ/ })).toBeVisible();

    await page.goto(`${WEB_BASE}/profile`);
    await waitForAppReady(page);
    await page.getByRole("button", { name: /เปิดเมนูโปรไฟล์|เมนูบัญชี|ตั้งค่า|บัญชี/i }).click();
    await page.getByRole("button", { name: "ออกจากระบบ" }).click();
    await waitForAppReady(page);
    await page.goto(`${WEB_BASE}/profile`);
    await waitForAppReady(page);
    await expect(page.getByRole("button", { name: /เข้าสู่ระบบ/ })).toBeVisible();

    await context.close();
  });
});
