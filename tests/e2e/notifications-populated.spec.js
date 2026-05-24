const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  createItem,
  signupAndContext,
  waitForAppReady,
  waitForNotification
} = require("./qxwap-test-helpers");

const stamp = Date.now();

let ownerApi;
let requesterApi;
let ownerState;
let offerId;
let ownerItem;
let requesterItem;

test.describe.serial("QXwap notifications populated state", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    test.setTimeout(120000);
    ownerApi = await signupAndContext(`notifications-owner-${stamp}@qxwap.app`);
    requesterApi = await signupAndContext(`notifications-requester-${stamp}@qxwap.app`);

    ownerItem = await createItem(ownerApi, stamp, {
      title: `Notification target ${stamp}`,
      description: "รายการหลักสำหรับทดสอบ notification populated state",
      category: "Electronics",
      condition: "Like new",
      wanted_text: "ต้องการแลก mechanical keyboard",
      wanted_tags: ["keyboard", "desk"],
      location_label: "พระราม 9, กรุงเทพฯ"
    });

    requesterItem = await createItem(requesterApi, stamp, {
      title: `Notification bundle ${stamp}`,
      description: "รายการแนบในข้อเสนอเพื่อให้ notification มี populated card",
      category: "Home",
      condition: "Good",
      wanted_text: "ต้องการแลกของแต่งโต๊ะ",
      wanted_tags: ["desk", "lamp"],
      location_label: "บางซื่อ, กรุงเทพฯ"
    });

    const offerRes = await requesterApi.post("offers", {
      data: {
        target_item_id: ownerItem.id,
        item_ids: [requesterItem.id],
        cash_amount: 500,
        message: `notification populated ${stamp}`
      }
    });
    expect(offerRes.status()).toBe(201);
    offerId = (await offerRes.json()).offer_id;

    await waitForNotification(ownerApi, offerId);
    ownerState = await ownerApi.storageState();
  });

  test("owner sees populated notification card and can open the offer detail", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/?view=notifications`);
    await waitForAppReady(page);

    const card = page.locator(".notification-offer-card").first();
    await expect(card).toBeVisible();
    await expect(card).toContainText(ownerItem.title);
    await expect(card).toContainText(requesterItem.title);
    await expect(card).toContainText("แลกเท่านั้น");
    await expect(card).toContainText("ใหม่");

    await card.getByRole("button", { name: "เปิดข้อเสนอนี้" }).click();
    await page.waitForURL(new RegExp(`view=offer_detail.*offer=${offerId}`), { timeout: 10000 });
    await expect(page.getByText("กำลังแลกอะไรกับอะไร")).toBeVisible();
    await expect(page.getByText(ownerItem.title)).toBeVisible();
    await expect(page.locator(".offer-bundle-card")).toContainText(requesterItem.title);

    await context.close();
  });
});
