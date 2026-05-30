const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  createItem,
  signupAndContext,
  waitForAppReady
} = require("./qxwap-test-helpers");

const stamp = Date.now();

let requesterState;
let ownerItem;
let offerId;

async function assertNoNestedButtonRegression(page, path, readyCheck) {
  const consoleIssues = [];
  page.on("console", (message) => {
    const text = message.text();
    if (!/validateDOMNesting|descendant of <button>|descendant of button|nested button/i.test(text)) return;
    consoleIssues.push(`${message.type()}: ${text}`);
  });

  await page.goto(`${WEB_BASE}${path}`);
  await waitForAppReady(page);
  if (readyCheck) {
    await readyCheck(page);
  }
  await page.waitForTimeout(300);

  const nestedCounts = await page.evaluate(() => ({
    buttonInButton: document.querySelectorAll("button button").length,
    interactiveRoleInButton: document.querySelectorAll('button [role=\"button\"]').length
  }));

  expect(nestedCounts.buttonInButton, `${path} should not render button inside button`).toBe(0);
  expect(nestedCounts.interactiveRoleInButton, `${path} should not render role=button inside button`).toBe(0);
  expect(consoleIssues, `${path} should not log nested button issues`).toEqual([]);
}

test.describe.serial("QXwap card and carousel regression", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    const ownerApi = await signupAndContext(`nested-owner-${stamp}@qxwap.app`);
    const requesterApi = await signupAndContext(`nested-requester-${stamp}@qxwap.app`);

    ownerItem = await createItem(ownerApi, stamp, {
      title: `Nested target ${stamp}`,
      description: "รายการสำหรับเช็ก nested button regression ใน detail และ wanted detail",
      category: "Electronics",
      condition: "Like new",
      wanted_text: "ต้องการแลก ergonomic chair",
      wanted_tags: ["chair", "desk"],
      location_label: "อโศก, กรุงเทพฯ"
    });

    const requesterItem = await createItem(requesterApi, stamp, {
      title: `Nested offer ${stamp}`,
      description: "รายการของ requester สำหรับทดสอบ swap detail",
      category: "Home",
      condition: "Good",
      wanted_text: "ต้องการแลกของแต่งโต๊ะ",
      wanted_tags: ["desk", "lamp"],
      location_label: "ห้วยขวาง, กรุงเทพฯ"
    });

    const offerResponse = await requesterApi.post("offers", {
      data: {
        target_item_id: ownerItem.id,
        item_ids: [requesterItem.id],
        cash_amount: 0,
        message: `nested regression ${stamp}`
      }
    });
    expect(offerResponse.status()).toBe(201);
    offerId = (await offerResponse.json()).offer_id;

    requesterState = await requesterApi.storageState();
  });

  test("explore, item detail, wanted detail, swap detail, and profile stay free of nested button console errors", async ({ browser }) => {
    const context = await browser.newContext({ storageState: requesterState });
    const page = await context.newPage();

    await assertNoNestedButtonRegression(page, "/explore", async (activePage) => {
      await expect(activePage.locator(".shop-card").first()).toBeVisible();
    });
    await assertNoNestedButtonRegression(page, `/items/${ownerItem.id}`, async (activePage) => {
      await expect(activePage.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    });
    await assertNoNestedButtonRegression(page, `/wanted/${ownerItem.wanted.item_id}`, async (activePage) => {
      await expect(activePage.getByRole("heading", { name: ownerItem.title }).first()).toBeVisible();
    });
    await assertNoNestedButtonRegression(page, `/swap/${offerId}`, async (activePage) => {
      await expect(activePage.getByText("กำลังแลกอะไรกับอะไร")).toBeVisible();
    });
    await assertNoNestedButtonRegression(page, "/profile", async (activePage) => {
      await expect(activePage.getByRole("heading", { name: /nested-requester/i }).first()).toBeVisible();
    });

    await context.close();
  });
});
