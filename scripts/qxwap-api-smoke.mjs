#!/usr/bin/env node

import { Buffer } from "node:buffer";

const rawBase = process.env.API_BASE_URL || process.env.API_BASE || "http://localhost:8787/api";
const apiBase = normalizeApiBase(rawBase);
const stamp = Date.now();

function normalizeApiBase(rawValue) {
  const raw = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(response, label) {
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  if (!contentType.includes("application/json")) {
    throw new Error(
      `${label} returned ${response.status} ${response.statusText || ""} with non-JSON content-type "${contentType}". ` +
        `Check API_BASE_URL/API_BASE points to the current QXwap API. Body starts: ${text.slice(0, 120)}`
    );
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error instanceof Error ? error.message : error}`);
  }

  if (!response.ok) {
    throw new Error(`${label} failed ${response.status}: ${data.message || data.error || JSON.stringify(data)}`);
  }

  return data;
}

async function getJson(path) {
  const response = await fetch(`${apiBase}${path}`);
  return readJson(response, `GET ${path}`);
}

class ApiAgent {
  cookie = "";

  async request(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (this.cookie) headers.set("cookie", this.cookie);
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(`${apiBase}${path}`, { ...init, headers });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(",").map((part) => part.split(";")[0]).join("; ");
    return readJson(response, `${init.method || "GET"} ${path}`);
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body || {})
    });
  }
}

async function main() {
  assert(apiBase, "API_BASE_URL/API_BASE is required");

  const health = await getJson("/health");
  assert(health.ok === true, "health.ok must be true");
  assert(health.required_tables === health.required_tables_expected, "health reports missing required tables");

  const version = await getJson("/version");
  assert(typeof version.commit === "string" && version.commit.length > 0, "version.commit must be set");
  assert(typeof version.node === "string" && version.node.startsWith("v"), "version.node must be Node version");
  assert(typeof version.builtAt === "string", "version.builtAt must be set");

  const seller = new ApiAgent();
  const buyer = new ApiAgent();
  const sellerEmail = `smoke-seller-${stamp}@qxwap.app`;
  const buyerEmail = `smoke-buyer-${stamp}@qxwap.app`;
  const password = "password123";

  const sellerSignup = await seller.post("/auth/signup", { email: sellerEmail, password });
  assert(sellerSignup.user?.id, "seller signup did not return user");

  const uploadForm = new FormData();
  const smokePngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lZt7VwAAAABJRU5ErkJggg==";
  const smokePngBytes = Uint8Array.from(Buffer.from(smokePngBase64, "base64"));
  uploadForm.append("images", new Blob([smokePngBytes], { type: "image/png" }), "smoke.png");
  const upload = await seller.post("/upload", uploadForm);
  assert(Array.isArray(upload.urls) && upload.urls[0], "upload did not return a URL");

  const itemTitle = `Smoke item ${stamp}`;
  const created = await seller.post("/items", {
    title: itemTitle,
    description: "Created by QXwap smoke test",
    category: "Other",
    condition: "Good",
    deal_type: "swap",
    price_cash: 0,
    price_credit: 10,
    open_to_offers: true,
    wanted_text: "smoke wanted tag",
    wanted_tags: [`smoke-${stamp}`, "เครดิต"],
    location_label: "Smoke QA",
    images: upload.urls
  });
  assert(created.item?.id, "create item did not return item");
  assert(created.item.media.images.length === 1, "created item did not keep uploaded image");

  const searched = await seller.get(`/items?q=${encodeURIComponent(itemTitle)}&wanted_tag=${encodeURIComponent(`smoke-${stamp}`)}`);
  assert(searched.items.some((item) => item.id === created.item.id), "search + wanted_tag did not find created item");

  const buyerSignup = await buyer.post("/auth/signup", { email: buyerEmail, password });
  assert(buyerSignup.user?.id, "buyer signup did not return user");

  const offer = await buyer.post("/offers", {
    target_item_id: created.item.id,
    message: "Smoke Xwap offer with no buyer items",
    cash_amount: 25,
    credit_amount: 15,
    item_ids: [],
    instant_swap: true,
    shipping_payer: "split",
    pickup_window: "วันนี้ 18:00-20:00"
  });
  assert(offer.offer_id, "offer did not return offer_id");

  const sellerOffers = await seller.get("/offers");
  assert(sellerOffers.offers.some((row) => row.id === offer.offer_id), "seller did not receive smoke offer");

  console.log(JSON.stringify({
    ok: true,
    apiBase,
    commit: version.commit,
    builtAt: version.builtAt,
    item_id: created.item.id,
    offer_id: offer.offer_id,
    upload_url: upload.urls[0],
    required_tables: health.required_tables
  }, null, 2));
}

main().catch((error) => {
  console.error("[QXwap smoke] failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
