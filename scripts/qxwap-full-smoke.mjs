#!/usr/bin/env node

// Comprehensive HTTP smoke that exercises the same assertions
// docs/ui-qa-checklist.md makes through the browser, using two API agents
// to simulate two real browser sessions. Run after qxwap-api-smoke.mjs
// shows ok=true.
//
// Run:
//   API_BASE_URL=https://qxwap-api.onrender.com/api node scripts/qxwap-full-smoke.mjs
//
// Exits non-zero on the first hard failure. Prints a checklist with PASS/FAIL.

const rawBase = process.env.API_BASE_URL || process.env.API_BASE || "http://localhost:8787/api";
const apiBase = (function normalize(b) {
  b = String(b || "").trim().replace(/\/+$/, "");
  return !b ? "" : (b.endsWith("/api") ? b : b + "/api");
})(rawBase);

if (!apiBase) {
  console.error("API_BASE_URL is required");
  process.exit(1);
}

const stamp = Date.now();
const results = [];
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    results.push({ ok: true, name, detail });
    console.log("\x1b[32m✓\x1b[0m " + name + (detail ? "  \x1b[2m" + detail + "\x1b[0m" : ""));
  } else {
    failed++;
    results.push({ ok: false, name, detail });
    console.log("\x1b[31m✗\x1b[0m " + name + (detail ? "  \x1b[33m" + detail + "\x1b[0m" : ""));
  }
}

function section(title) {
  console.log("\n\x1b[1;36m" + title + "\x1b[0m");
}

class ApiAgent {
  cookie = "";
  label = "";
  constructor(label) { this.label = label; }
  captureCookie(headers) {
    const headerList = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
    for (const rawCookie of headerList) {
      const match = String(rawCookie).match(/(?:^|,\s*)(qxwap\.sid=[^;]+|connect\.sid=[^;]+)/);
      if (match) this.cookie = match[1];
    }
  }
  async req(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (this.cookie) headers.set("cookie", this.cookie);
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const res = await fetch(`${apiBase}${path}`, { ...init, headers });
    this.captureCookie(res.headers);
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch (_) {}
    return { status: res.status, body, text, headers: res.headers };
  }
  get(p)       { return this.req(p); }
  post(p, b)   { return this.req(p, { method: "POST", body: b instanceof FormData ? b : JSON.stringify(b || {}) }); }
  patch(p, b)  { return this.req(p, { method: "PATCH", body: JSON.stringify(b || {}) }); }
  delete(p)    { return this.req(p, { method: "DELETE" }); }
}

async function main() {
  console.log(`\x1b[1mQXwap full smoke\x1b[0m  → ${apiBase}`);

  // 0. Health + version
  section("0. Health");
  const h = await fetch(`${apiBase}/health`).then((r) => r.json());
  check("health: ok=true",                h.ok === true);
  check("health: QXwap runtime",          h.name === "QXwap API");
  check("health: database connected",     h.database === "connected");
  check("health: all required tables",    h.required_tables === h.required_tables_expected, `${h.required_tables}/${h.required_tables_expected}`);
  const v = await fetch(`${apiBase}/version`).then((r) => r.json());
  check("version: commit set",            typeof v.commit === "string" && v.commit.length > 0, v.commit?.slice(0, 7));

  if (failed) { console.log("\n\x1b[31mEarly exit: backend not in expected state.\x1b[0m"); process.exit(1); }

  // 1. Two-session setup
  section("1. Two sessions signup");
  const A = new ApiAgent("owner");
  const B = new ApiAgent("intruder");
  const emailA = `smoke-owner-${stamp}@qxwap.app`;
  const emailB = `smoke-intruder-${stamp}@qxwap.app`;
  const pw = "password123";

  const suA = await A.post("/auth/signup", { email: emailA, password: pw });
  check("A signup 201",                   suA.status === 201);
  const suB = await B.post("/auth/signup", { email: emailB, password: pw });
  check("B signup 201",                   suB.status === 201);

  // 2. Owner gating
  section("2. Owner gating (Edit/Delete visibility + authz)");
  const create = await A.post("/items", {
    title: `Smoke owner item ${stamp}`, description: "owner gating test",
    category: "Other", condition: "Good", deal_type: "swap",
    open_to_offers: true, wanted_text: "anything",
    wanted_tags: [`smoke_${stamp}`], location_label: "QA"
  });
  check("A creates item 201",             create.status === 201);
  const itemId = create.body?.item?.id;
  check("item id returned",               !!itemId);

  const ownerView = await A.get(`/items/${itemId}`);
  check("A sees item with is_owner=true", ownerView.body?.item?.viewer?.is_owner === true);

  const intrView = await B.get(`/items/${itemId}`);
  check("B sees item with is_owner=false", intrView.body?.item?.viewer?.is_owner === false);

  const guestView = await fetch(`${apiBase}/items/${itemId}`).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
  check("Guest sees item with is_owner=false", guestView.body?.item?.viewer?.is_owner === false);

  const bPatch = await B.patch(`/items/${itemId}`, { title: "HACKED" });
  check("B PATCH /items/:id → 403",       bPatch.status === 403, bPatch.body?.error);

  const bDelete = await B.delete(`/items/${itemId}`);
  check("B DELETE /items/:id → 403",      bDelete.status === 403, bDelete.body?.error);

  const aPatch = await A.patch(`/items/${itemId}`, { title: `Smoke owner item ${stamp} v2` });
  check("A PATCH /items/:id → 200",       aPatch.status === 200);
  check("title updated",                  aPatch.body?.item?.title?.includes("v2"));

  // 3. Search / filter combinations
  section("3. Search/filter on real data");
  const q1 = await A.get(`/items?q=${encodeURIComponent(`Smoke owner item ${stamp}`)}`);
  check("search by title",                Array.isArray(q1.body?.items) && q1.body.items.some((i) => i.id === itemId));

  const q2 = await A.get(`/items?wanted_tag=${encodeURIComponent(`smoke_${stamp}`)}`);
  check("filter by wanted_tag",           q2.body?.items?.some((i) => i.id === itemId));

  const q3 = await A.get(`/items?q=${encodeURIComponent(`Smoke owner item ${stamp}`)}&category=Sports`);
  check("search + mismatched category = empty", q3.body?.items?.length === 0);

  const q4 = await A.get(`/items?q=QXWAP_NEVER_EXISTS_${stamp}`);
  check("no-match search returns empty",  q4.body?.items?.length === 0);

  // 4. Upload + image persists
  section("4. Upload + image persists");
  // Tiny 1x1 PNG so the bucket MIME filter accepts it
  const pngBytes = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63000100000005000100" +
    "0d0a2db40000000049454e44ae426082",
    "hex"
  );
  const fd = new FormData();
  fd.append("images", new Blob([pngBytes], { type: "image/png" }), "smoke.png");
  const up = await A.post("/upload", fd);
  check("upload 200",                     up.status === 200);
  check("upload returns url",             Array.isArray(up.body?.urls) && up.body.urls[0]);
  const uploadUrl = up.body?.urls?.[0] || "";
  const isSupabaseUrl = uploadUrl.includes("/storage/v1/object/public/qxwap/");
  if (uploadUrl) {
    if (isSupabaseUrl) check("upload uses Supabase Storage (prod)", true, uploadUrl);
    else if (uploadUrl.startsWith("/uploads/")) check("upload fell back to local disk (Supabase env missing)", false, uploadUrl);
    else check("upload uses unexpected backend",   false, uploadUrl);
  }

  // 5. Profile photo persistence across signout/signin
  section("5. Profile photo persistence");
  const patchP = await A.patch("/profiles/me", { display_name: `Smoke ${stamp}`, avatar_url: uploadUrl });
  check("PATCH /profiles/me → 200",       patchP.status === 200);
  check("avatar_url set on profile",      patchP.body?.profile?.avatar_url === uploadUrl);

  await A.post("/auth/signout", {});
  const reSigin = await A.post("/auth/signin", { email: emailA, password: pw });
  check("A signin again → 200",           reSigin.status === 200);
  check("avatar_url survives signin",     reSigin.body?.user?.avatar_url === uploadUrl);

  // 6. Cross-session: B sees A's profile with new avatar
  const aPubProfile = await B.get(`/profiles/${suA.body.user.id}`);
  check("B reads A public profile",        aPubProfile.status === 200);
  check("avatar visible across sessions",  aPubProfile.body?.profile?.avatar_url === uploadUrl);

  // 7. Offer end-to-end (sender no items → instant swap with cash+credit+message)
  section("7. Offer end-to-end (no-items sender)");
  const C = new ApiAgent("buyer");
  const emailC = `smoke-buyer-${stamp}@qxwap.app`;
  await C.post("/auth/signup", { email: emailC, password: pw });
  const offer = await C.post("/offers", {
    target_item_id: itemId,
    message: "Smoke offer with cash+credit",
    cash_amount: 50, credit_amount: 25, item_ids: [],
    instant_swap: true, shipping_payer: "split",
    pickup_window: "tonight 18:00-20:00"
  });
  check("C sends offer → 201",            offer.status === 201);
  const inboxA = await A.get("/offers/received");
  check("A receives offer in inbox",       inboxA.body?.offers?.some((o) => o.id === offer.body?.offer_id));

  const accept = await A.post(`/offers/${offer.body.offer_id}/accept`, {});
  check("A accepts offer",                 accept.status === 200 && accept.body?.status === "accepted");

  const ship = await A.post(`/shipments/${offer.body.offer_id}/start`, { tracking_number: "TRK-" + stamp });
  check("A starts shipment",               ship.status === 201);

  // 8. Notifications mark-read (cross-dialect)
  section("8. Notifications mark-read");
  const notifs = await A.get("/notifications");
  check("A has notifications",             Array.isArray(notifs.body?.notifications) && notifs.body.notifications.length > 0);
  const markAll = await A.post("/notifications/read", {});
  check("mark-all-read → 200",             markAll.status === 200 && markAll.body?.ok === true);
  const oneId = notifs.body?.notifications?.[0]?.id;
  if (oneId) {
    const markOne = await A.post("/notifications/read", { id: oneId });
    check("mark-one-read → 200",           markOne.status === 200 && markOne.body?.ok === true);
  }

  // 9. Owner DELETE (cleanup)
  section("9. Owner DELETE cleanup");
  const aDel = await A.delete(`/items/${itemId}`);
  check("A DELETE own item → 200",         aDel.status === 200);
  const gone = await A.get(`/items/${itemId}`);
  check("item is gone (404)",              gone.status === 404);

  // Summary
  console.log("\n\x1b[1mSummary\x1b[0m");
  console.log(`  total: ${results.length}, failed: ${failed}`);
  if (failed) {
    console.log("\x1b[31m\nFailures:\x1b[0m");
    for (const r of results) if (!r.ok) console.log("  - " + r.name + (r.detail ? " (" + r.detail + ")" : ""));
    process.exit(1);
  }
  console.log("\x1b[32mAll assertions passed.\x1b[0m");
}

main().catch((e) => { console.error("\x1b[31mUnexpected error:\x1b[0m", e.stack || e.message); process.exit(1); });
