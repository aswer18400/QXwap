const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  createItem,
  createSignedInContext,
  waitForAppReady,
  waitForNotification
} = require("./qxwap-test-helpers");

const ownerEmail = "mali@qxwap.app";
const requesterEmail = "niran@qxwap.app";
const stamp = Date.now();

let ownerApi;
let requesterApi;
let requesterState;
let ownerItem;
let offerId;

test.describe.serial("QXwap message-only offer detail", () => {
  test.setTimeout(90000);

  test.beforeAll(async () => {
    ownerApi = await createSignedInContext(ownerEmail);
    requesterApi = await createSignedInContext(requesterEmail);
    ownerItem = await createItem(ownerApi, stamp, {
      title: `Owner item for empty-offer ${stamp}`,
      description: "เจ้าของสินค้า สำหรับทดสอบข้อเสนอที่ไม่มีสินค้าแนบ"
    });

    const offerRes = await requesterApi.post("offers", {
      data: {
        target_item_id: ownerItem.id,
        message: `ข้อความ-only offer ${stamp}`,
        item_ids: []
      }
    });
    expect(offerRes.status()).toBe(201);
    offerId = (await offerRes.json()).offer_id;

    expect((await ownerApi.post(`offers/${offerId}/accept`, { data: {} })).status()).toBe(200);
    await waitForNotification(requesterApi, offerId);
    requesterState = await requesterApi.storageState();
  });

  test("requester sent-offer detail keeps the no-product explanation clear", async ({ browser }) => {
    const context = await browser.newContext({ storageState: requesterState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/swap/${offerId}?tab=sent`);
    await page.waitForURL(new RegExp(`/swap/${offerId}`), { timeout: 10000 });
    await waitForAppReady(page);

    await expect(page.getByText("สิ่งที่คุณแนบมากับข้อเสนอ")).toBeVisible();
    await expect(page.getByText("ข้อเสนอนี้ยังไม่ได้แนบสินค้า")).toBeVisible();
    await expect(page.getByText("สินค้าที่คุณขอแลก")).toBeVisible();
    await expect(page.getByRole("button", { name: "กลับไปหน้าข้อเสนอ" })).toBeVisible();

    await page.getByRole("button", { name: "กลับไปหน้าข้อเสนอ" }).click();
    await page.waitForURL(/\/deals(?:\?tab=sent)?/, { timeout: 10000 });
    await expect(page.getByRole("tab", { name: "กำลังแลก" })).toBeVisible();
    await expect(page.locator(".message-offer-card").first()).toBeVisible();

    await context.close();
  });
});
