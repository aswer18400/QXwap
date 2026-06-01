const { test, expect } = require("playwright/test");
const {
  WEB_BASE,
  signupAndContext,
  waitForAppReady
} = require("./qxwap-test-helpers");

const stamp = Date.now();
let signedInState;

test.describe.serial("QXwap secondary route usability pass", () => {
  test.setTimeout(120000);

  test.beforeAll(async () => {
    const api = await signupAndContext(`secondary-route-${stamp}@qxwap.app`);
    signedInState = await api.storageState();
  });

  test("login and signup stay on the auth shell only", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/login`);
    await waitForAppReady(page);
    await expect(page.locator(".auth-sheet--standalone")).toBeVisible();
    await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "เมนูหลัก" })).toHaveCount(0);
    await expect(page.getByText("สำหรับคุณ")).toHaveCount(0);

    await page.goto(`${WEB_BASE}/signup`);
    await waitForAppReady(page);
    await expect(page.locator(".auth-sheet--standalone")).toBeVisible();
    await expect(page.getByRole("heading", { name: "สร้างบัญชี" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "เมนูหลัก" })).toHaveCount(0);
    await expect(page.getByText("สินค้าแนะนำ")).toHaveCount(0);

    await context.close();
  });

  test("notifications, saved, connections, and chats keep concise route copy", async ({ browser }) => {
    const context = await browser.newContext({ storageState: signedInState });
    const page = await context.newPage();

    await page.goto(`${WEB_BASE}/notifications`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "การแจ้งเตือน" })).toBeVisible();
    await expect(page.getByText("ดูอัปเดตของดีล แชต และเครดิต")).toHaveCount(0);
    await expect(page.getByText("เปิดรายการใหม่ได้จากด้านล่าง")).toHaveCount(0);

    await page.goto(`${WEB_BASE}/saved`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "สินค้าที่บันทึก" })).toBeVisible();
    await expect(page.getByText("ดูรายการที่คุณบันทึกไว้")).toHaveCount(0);
    await expect(page.getByText("ยังไม่มีรายการที่บันทึกไว้")).toBeVisible();

    await page.goto(`${WEB_BASE}/connections?connections=following`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "กำลังติดตาม" })).toBeVisible();
    await expect(page.getByText("ดูผู้ติดตามและคนที่คุณติดตาม")).toHaveCount(0);
    await expect(page.getByText("ยังไม่ได้ติดตามใคร")).toBeVisible();

    await page.goto(`${WEB_BASE}/chats`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "แชตของฉัน" })).toBeVisible();
    await expect(page.getByText("ทุกห้องคุยที่ผูกกับดีลหรือสินค้า จะรวมไว้ที่นี่ทั้งหมด")).toHaveCount(0);
    await expect(page.getByText("ยังไม่มีห้องแชท")).toBeVisible();

    await context.close();
  });
});
