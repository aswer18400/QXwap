const fs = require("node:fs/promises");
const path = require("node:path");
const { test, expect } = require("playwright/test");
const { WEB_BASE, waitForAppReady } = require("../e2e/qxwap-test-helpers");

const QA_TEST_IDS = [
  "reset-seed-data",
  "feed-success",
  "feed-empty-no-following",
  "follow-user",
  "unfollow-user",
  "search-item-success",
  "search-item-empty",
  "create-item",
  "create-wanted-item",
  "save-item",
  "unsave-item",
  "create-swap-request",
  "accept-swap-request",
  "reject-swap-request",
  "counter-offer",
  "swap-expired",
  "swap-cancelled",
  "complete-swap",
  "credit-earned",
  "credit-redeem-success",
  "credit-redeem-insufficient",
  "reward-out-of-stock",
  "send-chat-message",
  "notification-count-zero",
  "notification-count-positive",
  "report-item",
  "offline-error-state",
  "public-profile-privacy",
  "own-profile-credit-visibility",
  "follow-affects-feed"
];

test.describe.serial("QXwap QA checklist matrix", () => {
  test.setTimeout(15 * 60 * 1000);

  test("runs all 30 QA actions against real services", async ({ page }, testInfo) => {
    test.skip(!/127\.0\.0\.1|localhost/.test(WEB_BASE), "QA matrix should run against the local dev environment only");

    await page.goto(`${WEB_BASE}/qa`);
    await waitForAppReady(page);
    await expect(page.getByRole("heading", { name: "QA Checklist", exact: true })).toBeVisible();

    const failures = [];
    const summaries = [];

    for (const id of QA_TEST_IDS) {
      const runButton = page.getByTestId(`qa-run-${id}`);
      await runButton.scrollIntoViewIfNeeded();
      await runButton.click();

      const state = page.getByTestId(`qa-result-state-${id}`);
      await expect(state).toBeVisible({ timeout: 120000 });

      const actualState = (await state.textContent())?.trim() || "";
      const summary = (await page.getByTestId(`qa-result-${id}`).textContent())?.replace(/\s+/g, " ").trim() || "";
      summaries.push({ id, state: actualState, summary });

      if (actualState !== "Pass") {
        failures.push({ id, summary });
      }
    }

    const outputJson = testInfo.outputPath("qa-matrix-results.json");
    const outputPng = testInfo.outputPath("qa-matrix-final.png");
    await fs.writeFile(outputJson, JSON.stringify(summaries, null, 2), "utf8");
    await page.screenshot({ path: outputPng, fullPage: true });
    await testInfo.attach("qa-matrix-results", { path: outputJson, contentType: "application/json" });
    await testInfo.attach("qa-matrix-final", { path: outputPng, contentType: "image/png" });

    expect(
      failures,
      failures.length
        ? `QA checklist failures:\n${failures.map((entry) => `- ${entry.id}: ${entry.summary}`).join("\n")}`
        : "all QA checklist tests passed"
    ).toEqual([]);
  });
});
