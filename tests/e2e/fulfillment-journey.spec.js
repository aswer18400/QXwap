const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  createItem,
  signupAndContext,
  waitForAppReady
} = require("./qxwap-test-helpers");

const stamp = Date.now();

let ownerApi;
let requesterApi;
let ownerState;
let requesterState;
let offerId;

test.describe.serial("QXwap fulfillment UI journey", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    ownerApi = await signupAndContext(`fulfillment-owner-${stamp}@qxwap.app`);
    requesterApi = await signupAndContext(`fulfillment-requester-${stamp}@qxwap.app`);

    const ownerItem = await createItem(ownerApi, stamp, {
      title: `Fulfillment owner item ${stamp}`,
      description: "owner target for UI fulfillment test",
      category: "Books",
      condition: "Like new",
      deal_type: "swap",
      open_to_offers: true,
      wanted_tags: ["fulfillment"],
      location_label: "อโศก, กรุงเทพฯ"
    });

    const requesterItem = await createItem(requesterApi, stamp, {
      title: `Fulfillment requester item ${stamp}`,
      description: "requester trade-in for UI fulfillment test",
      category: "Home",
      condition: "Good",
      deal_type: "swap",
      open_to_offers: true,
      wanted_tags: ["fulfillment"],
      location_label: "อารีย์, กรุงเทพฯ"
    });

    const offerRes = await requesterApi.post("offers", {
      data: {
        target_item_id: ownerItem.id,
        item_ids: [requesterItem.id],
        message: `fulfillment message ${stamp}`
      }
    });
    expect(offerRes.status()).toBe(201);
    offerId = (await offerRes.json()).offer_id;

    expect((await ownerApi.post(`offers/${offerId}/accept`, { data: {} })).status()).toBe(200);
    expect((await requesterApi.post(`offers/${offerId}/approve`, { data: {} })).status()).toBe(200);

    ownerState = await ownerApi.storageState();
    requesterState = await requesterApi.storageState();
  });

  test("participants can drive accepted deal through schedule, shipment, and receipt confirmations", async ({ browser }) => {
    const requesterContext = await browser.newContext({ storageState: requesterState });
    const requesterPage = await requesterContext.newPage();
    await requesterPage.goto(`${WEB_BASE}/?view=offer_detail&offer=${offerId}&tab=sent`);
    await waitForAppReady(requesterPage);

    await requesterPage.getByPlaceholder(/เช่น ส่งพรุ่งนี้ช่วงบ่าย/).fill("รับของวันเสาร์ 18:30");
    await requesterPage.getByRole("button", { name: "บันทึกแผนนัดรับ" }).click();
    await requesterPage.waitForTimeout(1500);
    await expect(requesterPage.getByRole("button", { name: "คุณยืนยันนัดแล้ว" })).toBeVisible();

    const ownerContext = await browser.newContext({ storageState: ownerState });
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(`${WEB_BASE}/?view=offer_detail&offer=${offerId}&tab=received`);
    await waitForAppReady(ownerPage);

    await ownerPage.getByRole("button", { name: "ยืนยันเวลานัดฝั่งคุณ" }).click();
    await ownerPage.waitForTimeout(1500);
    await expect(ownerPage.getByText("พร้อมเริ่มส่งมอบ").first()).toBeVisible();

    expect((await ownerApi.patch(`offers/${offerId}/logistics`, {
      data: { logistics: { proofs: { owner_pickup: "/uploads/fake-owner-pickup.png", owner_dropoff: "/uploads/fake-owner-dropoff.png" } } }
    })).status()).toBe(200);

    await ownerPage.reload();
    await waitForAppReady(ownerPage);
    await ownerPage.getByRole("button", { name: "ยืนยันว่าเริ่มรับของแล้ว" }).click();
    await ownerPage.waitForTimeout(1200);

    await requesterPage.reload();
    await waitForAppReady(requesterPage);
    await expect(requesterPage.getByRole("button", { name: "ยืนยันว่าอยู่ระหว่างส่งมอบ" })).toBeVisible();
    await requesterPage.getByRole("button", { name: "ยืนยันว่าอยู่ระหว่างส่งมอบ" }).click();
    await requesterPage.waitForTimeout(1200);

    await ownerPage.reload();
    await waitForAppReady(ownerPage);
    await expect(ownerPage.getByRole("button", { name: "ยืนยันว่าจบการส่งมอบแล้ว" })).toBeVisible();
    await ownerPage.getByRole("button", { name: "ยืนยันว่าจบการส่งมอบแล้ว" }).click();
    await ownerPage.waitForTimeout(1200);
    await expect(ownerPage.getByText("ส่งมอบเสร็จ รอยืนยันรับของ").first()).toBeVisible();

    await requesterPage.reload();
    await waitForAppReady(requesterPage);
    await requesterPage.getByRole("button", { name: "ยืนยันรับของเรียบร้อย" }).click();
    await requesterPage.waitForTimeout(1200);
    await expect(requesterPage.getByText("1/2 ฝ่ายยืนยันแล้ว").first()).toBeVisible();

    await ownerPage.reload();
    await waitForAppReady(ownerPage);
    await ownerPage.getByRole("button", { name: "ยืนยันรับของเรียบร้อย" }).click();
    await ownerPage.waitForTimeout(1500);
    await expect(ownerPage.getByText("แลกสินค้าสำเร็จ")).toBeVisible();

    await requesterContext.close();
    await ownerContext.close();
  });
});
