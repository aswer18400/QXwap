const { expect, request: pwRequest } = require("playwright/test");

const WEB_BASE = process.env.E2E_WEB_BASE || "http://127.0.0.1:5173";
const API_BASE = `${(process.env.E2E_API_BASE || "http://127.0.0.1:8787/api").replace(/\/$/, "")}/`;
const password = process.env.E2E_PASSWORD || "password123";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createSignedInContext(email) {
  const api = await pwRequest.newContext({ baseURL: API_BASE });
  const signin = await api.post("auth/signin", { data: { email, password } });
  expect(signin.status(), `signin should work for ${email}`).toBe(200);
  return api;
}

async function signupAndContext(email) {
  const api = await pwRequest.newContext({ baseURL: API_BASE });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const signup = await api.post("auth/signup", { data: { email, password } });
    if (signup.status() === 201) return api;
    if (signup.status() !== 429) {
      expect(signup.status(), `signup should work for ${email}`).toBe(201);
      return api;
    }
    const retryAfterSec = Number(signup.headers()["retry-after"] || "1");
    if (attempt === 2) {
      expect(signup.status(), `signup should work for ${email}`).toBe(201);
      return api;
    }
    await sleep((retryAfterSec + 1) * 1000);
  }
  return api;
}

async function currentUser(api) {
  const response = await api.get("auth/me");
  expect(response.status()).toBe(200);
  return (await response.json()).user;
}

async function createItem(api, stamp, overrides = {}) {
  const response = await api.post("items", {
    data: {
      title: `E2E item ${stamp}`,
      description: "ใช้สำหรับทดสอบ customer journey",
      category: "Books",
      condition: "Like new",
      deal_type: "swap",
      price_cash: 0,
      price_cash_unknown: true,
      price_credit: 0,
      open_to_offers: true,
      wanted_text: "ต้องการแลกของที่ใช้งานได้จริง",
      wanted_tags: ["ux", "keyboard"],
      location_label: "อโศก, กรุงเทพฯ",
      latitude: 13.7563,
      longitude: 100.5018,
      images: [],
      ...overrides
    }
  });
  expect(response.status()).toBe(201);
  const data = await response.json();
  return data.item;
}

async function waitForAppReady(page) {
  await page.waitForTimeout(1800);
  await page.locator("body").waitFor({ state: "visible" });
}

async function waitForNotification(api, targetOfferId) {
  for (let i = 0; i < 12; i += 1) {
    const response = await api.get("notifications");
    expect(response.status()).toBe(200);
    const data = await response.json();
    const hit = (data.notifications || []).find((entry) => entry?.data?.offer_id === targetOfferId);
    if (hit) return hit;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`notification for offer ${targetOfferId} not found`);
}

module.exports = {
  API_BASE,
  WEB_BASE,
  createItem,
  createSignedInContext,
  currentUser,
  password,
  signupAndContext,
  waitForAppReady,
  waitForNotification
};
