const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  createItem,
  currentUser,
  signupAndContext,
  waitForAppReady
} = require("./qxwap-test-helpers");

const stamp = Date.now();

let ownerApi;
let requesterApi;
let ownerState;
let requesterState;
let ownerProfile;
let ownerItem;
let requesterItem;
let offerId;

test.describe.serial("QXwap wanted detail and home deal status", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    test.setTimeout(120000);
    ownerApi = await signupAndContext(`wanted-owner-${stamp}@qxwap.app`);
    requesterApi = await signupAndContext(`wanted-requester-${stamp}@qxwap.app`);

    ownerProfile = await currentUser(ownerApi);

    ownerItem = await createItem(ownerApi, stamp, {
      title: `Wanted source ${stamp}`,
      description: "รายการหลักสำหรับทดสอบ wanted detail route จริงจากในแอป",
      category: "Electronics",
      condition: "Like new",
      wanted_text: "ต้องการแลก ergonomic chair",
      wanted_tags: ["chair", "desk"],
      location_label: "อโศก, กรุงเทพฯ"
    });
    expect(ownerItem.wanted?.item_id).toBeTruthy();

    requesterItem = await createItem(requesterApi, stamp, {
      title: `Swap offer ${stamp}`,
      description: "รายการของฝั่ง requester สำหรับใช้ทดสอบดีลในหน้า Home",
      category: "Home",
      condition: "Good",
      wanted_text: "ต้องการแลกของแต่งโต๊ะ",
      wanted_tags: ["desk", "lamp"],
      location_label: "ห้วยขวาง, กรุงเทพฯ"
    });

    const followResponse = await requesterApi.post(`follows/${ownerProfile.id}`);
    expect(followResponse.status()).toBe(200);

    const offerResponse = await requesterApi.post("offers", {
      data: {
        target_item_id: ownerItem.id,
        item_ids: [requesterItem.id],
        cash_amount: 0,
        message: `deal-aware home status ${stamp}`
      }
    });
    expect(offerResponse.status()).toBe(201);
    offerId = (await offerResponse.json()).offer_id;

    ownerState = await ownerApi.storageState();
    requesterState = await requesterApi.storageState();
  });

  test("requester can enter wanted detail from home feed and sees sent deal status on home", async ({ browser }) => {
    const context = await browser.newContext({ storageState: requesterState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/`);
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: "ฟีดจากคนที่คุณติดตาม" })).toBeVisible();
    await expect(page.getByText(ownerItem.title).first()).toBeVisible();

    await page.getByRole("button", { name: "ดูของที่อยากได้" }).first().click();
    await page.waitForURL(new RegExp(`/wanted/${ownerItem.wanted.item_id}`), { timeout: 10000 });
    await expect(page.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    await expect(page.getByText("Wanted listing")).toBeVisible();

    await page.reload();
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    await expect(page.getByText("Wanted listing")).toBeVisible();

    await page.goto(`${WEB_BASE}/`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "สถานะดีลตอนนี้" })).toBeVisible();
    await expect(page.getByText("รออีกฝ่ายตอบ").first()).toBeVisible();

    await page.getByRole("button", { name: "เปิดดีลนี้" }).first().click();
    await page.waitForURL(new RegExp(`/swap/${offerId}`), { timeout: 10000 });
    await expect(page.getByText("กำลังแลกอะไรกับอะไร")).toBeVisible();

    await context.close();
  });

  test("owner sees action-first deal status on home and can open the same swap", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ownerState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/`);
    await waitForAppReady(page);

    await expect(page.getByRole("heading", { name: "สถานะดีลตอนนี้" })).toBeVisible();
    await expect(page.getByText("ต้องตอบดีลนี้").first()).toBeVisible();

    await page.getByRole("button", { name: "เปิดดีลนี้" }).first().click();
    await page.waitForURL(new RegExp(`/swap/${offerId}`), { timeout: 10000 });
    await expect(page.getByText("กำลังแลกอะไรกับอะไร")).toBeVisible();

    await context.close();
  });
});
