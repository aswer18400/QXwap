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
let ownerUser;
let requesterUser;
let offerId;

test.describe.serial("QXwap request return journey", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    ownerApi = await signupAndContext(`return-owner-${stamp}@qxwap.app`);
    requesterApi = await signupAndContext(`return-requester-${stamp}@qxwap.app`);
    ownerUser = await currentUser(ownerApi);
    requesterUser = await currentUser(requesterApi);

    const ownerItem = await createItem(ownerApi, stamp, {
      title: `Return owner item ${stamp}`,
      description: "owner target for return journey",
      category: "Electronics",
      wanted_tags: ["return"]
    });

    const requesterItem = await createItem(requesterApi, stamp, {
      title: `Return requester item ${stamp}`,
      description: "requester trade-in for return journey",
      category: "Home",
      wanted_tags: ["return"]
    });

    const offerRes = await requesterApi.post("offers", {
      data: {
        target_item_id: ownerItem.id,
        item_ids: [requesterItem.id],
        message: `return flow message ${stamp}`
      }
    });
    expect(offerRes.status()).toBe(201);
    offerId = (await offerRes.json()).offer_id;

    expect((await ownerApi.post(`offers/${offerId}/accept`, { data: {} })).status()).toBe(200);
    expect((await requesterApi.post(`offers/${offerId}/approve`, { data: {} })).status()).toBe(200);

    const shipmentStart = await requesterApi.post(`shipments/${offerId}/start`, {
      data: {
        pickup_window: "รับของวันอาทิตย์ 13:00",
        shipping_payer: "split",
        shipping_method: "courier"
      }
    });
    expect([200, 201]).toContain(shipmentStart.status());

    expect((await ownerApi.patch(`offers/${offerId}/logistics`, {
      data: {
        logistics: {
          schedule_confirmations: {
            [requesterUser.id]: new Date().toISOString(),
            [ownerUser.id]: new Date().toISOString()
          },
          proofs: {
            requester_pickup: "/uploads/requester-pickup.png",
            requester_dropoff: "/uploads/requester-dropoff.png",
            owner_pickup: "/uploads/owner-pickup.png",
            owner_dropoff: "/uploads/owner-dropoff.png"
          }
        }
      }
    })).status()).toBe(200);

    const shipmentRes = await requesterApi.get(`shipments/${offerId}`);
    expect(shipmentRes.status()).toBe(200);
    const shipmentId = (await shipmentRes.json()).shipment.id;

    expect((await ownerApi.post(`shipments/${shipmentId}/update-step`, { data: { current_step: "picked_up" } })).status()).toBe(200);
    expect((await requesterApi.post(`shipments/${shipmentId}/update-step`, { data: { current_step: "in_transit" } })).status()).toBe(200);
    expect((await ownerApi.post(`shipments/${shipmentId}/finish`, { data: {} })).status()).toBe(200);

    ownerState = await ownerApi.storageState();
    requesterState = await requesterApi.storageState();
  });

  test("requester can ask for a return and owner sees the return state", async ({ browser }) => {
    const requesterContext = await browser.newContext({ storageState: requesterState });
    const requesterPage = await requesterContext.newPage();
    await requesterPage.goto(`${WEB_BASE}/?view=offer_detail&offer=${offerId}&tab=sent`);
    await waitForAppReady(requesterPage);

    requesterPage.once("dialog", (dialog) => dialog.accept("สินค้าที่ได้รับไม่ตรงกับที่คุยไว้"));
    await requesterPage.getByRole("button", { name: "ขอคืนสินค้า" }).click();
    await requesterPage.waitForTimeout(1500);
    await expect(requesterPage.getByText("คุณส่งคำขอคืนสินค้าแล้ว").first()).toBeVisible();

    const ownerContext = await browser.newContext({ storageState: ownerState });
    const ownerPage = await ownerContext.newPage();
    await ownerPage.goto(`${WEB_BASE}/?view=offer_detail&offer=${offerId}&tab=received`);
    await waitForAppReady(ownerPage);

    await expect(ownerPage.getByText("อีกฝ่ายร้องขอคืนสินค้า").first()).toBeVisible();
    await expect(ownerPage.getByText("สินค้าที่ได้รับไม่ตรงกับที่คุยไว้")).toBeVisible();

    await requesterContext.close();
    await ownerContext.close();
  });
});
