const { test, expect } = require("playwright/test");

const WEB_BASE = process.env.E2E_WEB_BASE || process.env.PRODUCTION_PREVIEW_URL || "https://aswer18400.github.io/QXwap";
const ROUTES = [
  "/",
  "/explore",
  "/login",
  "/signup",
  "/credits"
];

test.describe("QXwap production preview matrix", () => {
  test.setTimeout(120000);

  for (const route of ROUTES) {
    test(`guest route loads without obvious shell failure: ${route}`, async ({ page }) => {
      await page.goto(`${WEB_BASE}${route}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1500);
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("text=Something went wrong")).toHaveCount(0);
      await expect(page.locator(".toast")).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("Cannot GET");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
    });
  }
});
