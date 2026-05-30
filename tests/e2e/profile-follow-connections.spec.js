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
let followerApi;
let ownerUser;
let followerState;

test.describe.serial("QXwap profile follow + connections journey", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    test.setTimeout(120000);
    ownerApi = await signupAndContext(`profile-owner-${stamp}@qxwap.app`);
    followerApi = await signupAndContext(`profile-follower-${stamp}@qxwap.app`);
    ownerUser = await currentUser(ownerApi);

    await createItem(ownerApi, stamp, {
      title: `Profile owner listing ${stamp}`,
      description: "ใช้ทดสอบ follow feed และ public profile",
      category: "Electronics",
      condition: "Like new",
      wanted_text: "ต้องการแลก ergonomic chair",
      wanted_tags: ["chair", "desk"],
      location_label: "อโศก, กรุงเทพฯ"
    });

    followerState = await followerApi.storageState();
  });

  test("public profile hides private credit, follow updates connections page and feed", async ({ browser }) => {
    const context = await browser.newContext({ storageState: followerState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/profile/${ownerUser.id}`);
    await waitForAppReady(page);

    await expect(page.getByText("QX Credit")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "ติดตามร้านนี้" })).toBeVisible();
    await page.getByRole("button", { name: "ติดตามร้านนี้" }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByRole("button", { name: "เลิกติดตาม" })).toBeVisible();

    await page.goto(`${WEB_BASE}/connections?connections=following`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "กำลังติดตาม", exact: true })).toBeVisible();
    await expect(page.locator(".app-user-mini-card").first()).toContainText(ownerUser.display_name || ownerUser.username || "QXwap user");

    await page.goto(`${WEB_BASE}/`);
    await waitForAppReady(page);
    await expect(page.getByText(`Profile owner listing ${stamp}`).first()).toBeVisible();

    await page.goto(`${WEB_BASE}/profile/${ownerUser.id}`);
    await waitForAppReady(page);
    await page.getByRole("button", { name: "เลิกติดตาม" }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByRole("button", { name: "ติดตามร้านนี้" })).toBeVisible();

    await page.goto(`${WEB_BASE}/connections?connections=following`);
    await waitForAppReady(page);
    await expect(page.getByText("ยังไม่ได้ติดตามใคร")).toBeVisible();

    await page.goto(`${WEB_BASE}/`);
    await waitForAppReady(page);
    await expect(page.getByText("เริ่มติดตามร้านเพื่อสร้างฟีดของคุณ")).toBeVisible();

    await context.close();
  });
});
