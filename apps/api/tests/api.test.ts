import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, validateRuntimeConfig } from "../src/server.js";

describe("QXwap API", async () => {
  const app = await createApp();

  it("serves health and seeded items", async () => {
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body.database).toBe("connected");
    expect(health.body.required_tables).toBe(health.body.required_tables_expected);
    expect(Number(health.body.items || 0)).toBeGreaterThanOrEqual(100);
    const items = await request(app).get("/api/items?q=iPad");
    expect(items.status).toBe(200);
    expect(items.body.items.length).toBeGreaterThan(0);
  });

  it("sets security headers on every response", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers["permissions-policy"]).toContain("camera=()");
    expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    // HSTS is production-only; in NODE_ENV=test it must be absent so the
    // dev http://localhost server is not pinned in the browser.
    expect(res.headers["strict-transport-security"]).toBeUndefined();
  });

  it("exposes build metadata at /api/version", async () => {
    const res = await request(app).get("/api/version");
    expect(res.status).toBe(200);
    expect(typeof res.body.commit).toBe("string");
    expect(res.body.commit.length).toBeGreaterThan(0);
    expect(typeof res.body.node).toBe("string");
    expect(res.body.node.startsWith("v")).toBe(true);
    expect(typeof res.body.builtAt).toBe("string");
    expect(typeof res.body.startedAt).toBe("string");
  });

  it("emits x-request-id on every response and forwards a valid client-supplied id", async () => {
    // Server-generated id when client does not supply one
    const generated = await request(app).get("/api/health");
    expect(generated.status).toBe(200);
    const generatedId = generated.headers["x-request-id"];
    expect(typeof generatedId).toBe("string");
    expect(generatedId.length).toBeGreaterThanOrEqual(8);

    // Each response gets its own id
    const second = await request(app).get("/api/health");
    expect(second.headers["x-request-id"]).not.toBe(generatedId);

    // Valid client-supplied id is echoed back
    const forwarded = await request(app)
      .get("/api/items")
      .set("x-request-id", "req-test-abc.123_XYZ");
    expect(forwarded.headers["x-request-id"]).toBe("req-test-abc.123_XYZ");

    // Invalid client-supplied id (too long / contains illegal chars) is replaced
    const overlong = "x".repeat(300);
    const rejected = await request(app).get("/api/items").set("x-request-id", overlong);
    expect(rejected.headers["x-request-id"]).not.toBe(overlong);
    expect(rejected.headers["x-request-id"].length).toBeLessThanOrEqual(128);

    const illegal = await request(app).get("/api/items").set("x-request-id", "bad id with spaces");
    expect(illegal.headers["x-request-id"]).not.toBe("bad id with spaces");
  });

  it("returns 401 for invalid login", async () => {
    const res = await request(app).post("/api/auth/signin").send({ email: "mali@qxwap.app", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("creates signup profile details and rejects duplicate signup emails", async () => {
    const email = `complete-login-${Date.now()}@qxwap.app`;
    const signup = await request(app).post("/api/auth/signup").send({
      email,
      password: "password123",
      display_name: "Complete Login User"
    });
    expect(signup.status).toBe(201);
    expect(signup.body.user.email).toBe(email);
    expect(signup.body.user.display_name).toBe("Complete Login User");

    const duplicate = await request(app).post("/api/auth/signup").send({ email, password: "password123" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("EMAIL_EXISTS");
  });

  it("protects authenticated account resources from guests", async () => {
    const protectedRoutes = ["/api/bookmarks", "/api/offers", "/api/wallet"];

    for (const route of protectedRoutes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("AUTH_REQUIRED");
    }
  });

  it("signin response time does not leak email existence (no timing oracle)", async () => {
    // Warm-up: bcrypt's first call after import can be slow; ignore it.
    await request(app).post("/api/auth/signin").send({ email: "mali@qxwap.app", password: "warmup" });

    async function measure(email: string, password: string) {
      const samples: number[] = [];
      for (let i = 0; i < 4; i++) {
        const t = process.hrtime.bigint();
        const res = await request(app).post("/api/auth/signin").send({ email, password });
        const dur = Number(process.hrtime.bigint() - t) / 1e6;
        expect(res.status).toBe(401);
        samples.push(dur);
      }
      // Drop fastest and slowest, average the middle two — reduces jitter.
      samples.sort((a, b) => a - b);
      return (samples[1] + samples[2]) / 2;
    }

    const knownEmailWrongPw = await measure("mali@qxwap.app", "definitely-not-the-password");
    const unknownEmail = await measure(`never-existed-${Date.now()}@qxwap.app`, "anything-goes");

    // Both paths must run bcrypt.compare exactly once. Allow a 60ms band on
    // top of the larger sample to absorb DB-query jitter on PGlite. If the
    // gap is larger, the dummy-hash protection regressed (e.g. someone added
    // an early return).
    const slower = Math.max(knownEmailWrongPw, unknownEmail);
    const gap = Math.abs(knownEmailWrongPw - unknownEmail);
    expect(gap).toBeLessThan(slower * 0.5 + 60);
  });

  it("fails fast for unsafe production runtime config", () => {
    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: "production",
        SESSION_SECRET: "change-me-in-production",
        FRONTEND_ORIGIN: "*"
      } as NodeJS.ProcessEnv)
    ).toThrow(/DATABASE_URL is required/);

    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: "development",
        SUPABASE_URL: "https://example.supabase.co",
        STORAGE_BUCKET: "qxwap"
      } as NodeJS.ProcessEnv)
    ).toThrow(/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STORAGE_BUCKET/);

    expect(() =>
      validateRuntimeConfig({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@example.com:5432/qxwap",
        SESSION_SECRET: "a-long-random-production-secret",
        FRONTEND_ORIGIN: "https://qxwap.example.com",
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        STORAGE_BUCKET: "qxwap"
      } as NodeJS.ProcessEnv)
    ).not.toThrow();
  });

  it("allows account with no products to send instant swap cash/message/credit offer", async () => {
    const item = (await request(app).get("/api/items")).body.items.find((row: any) => row.owner.name.includes("มะลิ"));
    const agent = request.agent(app);
    const email = `new-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);
    const beforeWallet = await agent.get("/api/wallet");
    expect(beforeWallet.status).toBe(200);
    const beforeBalance = Number(beforeWallet.body.wallet.credit_balance || 0);
    expect(signup.body.user).toBeTruthy();
    const offer = await agent.post("/api/offers").send({
      target_item_id: item.id,
      message: "สนใจแลกพร้อมเพิ่มเงินครับ",
      cash_amount: 100,
      credit_amount: 50,
      item_ids: [],
      instant_swap: true,
      shipping_payer: "split",
      pickup_window: "วันนี้ 18:00-20:00"
    });
    expect(offer.status).toBe(201);
    expect(offer.body.offer_id).toBeTruthy();
    const afterWallet = await agent.get("/api/wallet");
    expect(afterWallet.status).toBe(200);
    expect(Number(afterWallet.body.wallet.credit_balance || 0)).toBe(beforeBalance);

    const owner = request.agent(app);
    const signin = await owner.post("/api/auth/signin").send({ email: "mali@qxwap.app", password: "password123" });
    expect(signin.status).toBe(200);
    const reject = await owner.post(`/api/offers/${offer.body.offer_id}/reject`).send({ rejection_reason: "distance" });
    expect(reject.status).toBe(200);
    const rejected = await owner.get(`/api/offers/${offer.body.offer_id}`);
    expect(rejected.body.offer.status).toBe("rejected");
    expect(rejected.body.offer.rejection_reason).toBe("distance");
  });

  it("rejects empty offers that contain no message, no items, no cash, and no credit", async () => {
    const item = (await request(app).get("/api/items")).body.items.find((row: any) => row.owner.name.includes("มะลิ"));
    const agent = request.agent(app);
    const email = `empty-offer-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const beforeWallet = await agent.get("/api/wallet");
    expect(beforeWallet.status).toBe(200);
    const beforeBalance = Number(beforeWallet.body.wallet.credit_balance || 0);

    const offer = await agent.post("/api/offers").send({
      target_item_id: item.id,
      message: "",
      cash_amount: 0,
      credit_amount: 0,
      item_ids: []
    });
    expect(offer.status).toBe(400);
    expect(offer.body.error).toBe("EMPTY_OFFER");

    const afterWallet = await agent.get("/api/wallet");
    expect(afterWallet.status).toBe(200);
    expect(Number(afterWallet.body.wallet.credit_balance || 0)).toBe(beforeBalance);
  });

  it("persists uploads and newly created items through the API", async () => {
    const agent = request.agent(app);
    const email = `seller-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const upload = await agent
      .post("/api/upload")
      .attach("images", Buffer.from("qxwap-test-image"), { filename: "item.txt", contentType: "text/plain" });
    expect(upload.status).toBe(200);
    expect(upload.body.urls[0]).toMatch(/^\/uploads\//);

    const created = await agent.post("/api/items").send({
      title: "Test persistence item",
      description: "created by automated API test",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      price_cash: 0,
      price_credit: 25,
      open_to_offers: true,
      wanted_text: "coffee or credits",
      wanted_tags: ["กาแฟ", "เครดิต"],
      location_label: "QA Lab",
      images: upload.body.urls
    });
    expect(created.status).toBe(201);
    expect(created.body.item.media.images.length).toBe(1);

    const fetched = await request(app).get(`/api/items/${created.body.item.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.item.title).toBe("Test persistence item");
    expect(fetched.body.item.wanted.tags).toContain("กาแฟ");
    expect(fetched.body.item.owner.id).toBeTruthy();
    expect(fetched.body.item.deal.type).toBe("swap");
    expect(fetched.body.item.viewer).toHaveProperty("is_bookmarked");
  });

  it("serves banners, campaigns, hashtags, and location search data", async () => {
    const banners = await request(app).get("/api/banners");
    expect(banners.status).toBe(200);
    expect(banners.body.banners.length).toBeGreaterThan(0);

    const campaignTarget = banners.body.banners.find((row: any) => row.target_type === "campaign_detail");
    expect(campaignTarget).toBeTruthy();

    const campaign = await request(app).get(`/api/campaigns/${campaignTarget.campaign_id || campaignTarget.target_value}`);
    expect(campaign.status).toBe(200);
    expect(campaign.body.campaign.title).toBeTruthy();

    const trending = await request(app).get("/api/hashtags/trending?limit=5");
    expect(trending.status).toBe(200);
    expect(Array.isArray(trending.body.hashtags)).toBe(true);
    expect(trending.body.hashtags.length).toBeGreaterThan(0);
    expect(trending.body.hashtags[0].label).toMatch(/^#/);

    const suggest = await request(app).get("/api/hashtags/suggest?q=กล้");
    expect(suggest.status).toBe(200);
    expect(Array.isArray(suggest.body.hashtags)).toBe(true);

    const location = await request(app).get("/api/location/search?q=สยาม");
    expect(location.status).toBe(200);
    expect(Array.isArray(location.body.locations)).toBe(true);
  });

  it("stores normalized hashtags and lat/lng on created items", async () => {
    const agent = request.agent(app);
    const email = `geo-item-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const created = await agent.post("/api/items").send({
      title: "Geo tagged item",
      description: "nearby test",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      wanted_tags: ["#กล้อง ฟิล์ม", "กล้อง-ฟิล์ม", "  เครดิต  "],
      location_label: "BTS สยาม",
      latitude: 13.7466,
      longitude: 100.5347
    });
    expect(created.status).toBe(201);
    expect(created.body.item.wanted.tags).toContain("กล้อง-ฟิล์ม");
    expect(created.body.item.wanted.tags).toContain("เครดิต");
    expect(created.body.item.location.latitude).toBeTruthy();
    expect(created.body.item.location.longitude).toBeTruthy();
    expect(created.body.item.location.maps_url).toContain("google.com/maps");
  });

  it("allows unknown cash price without field validation errors", async () => {
    const agent = request.agent(app);
    const email = `unknown-price-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const created = await agent.post("/api/items").send({
      title: "Unknown price item",
      description: "cash price intentionally unknown",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      price_cash_unknown: true,
      wanted_tags: ["ราคายังไม่ชัวร์"],
      location_label: "BTS สยาม"
    });
    expect(created.status).toBe(201);
    expect(created.body.item.deal.price_cash_unknown).toBe(true);
    expect(created.body.item.deal.price_cash).toBe(0);

    const fetched = await agent.get(`/api/items/${created.body.item.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.item.deal.price_cash_unknown).toBe(true);
  });

  it("supports up to 5 product images and rejects more than 5", async () => {
    const agent = request.agent(app);
    const email = `multi-image-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const allowed = await agent.post("/api/items").send({
      title: "Five image product",
      description: "image-capable product",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      wanted_tags: ["รูป"],
      images: ["/uploads/1.png", "/uploads/2.png", "/uploads/3.png", "/uploads/4.png", "/uploads/5.png"]
    });
    expect(allowed.status).toBe(201);
    expect(allowed.body.item.media.images).toHaveLength(5);

    const rejected = await agent.post("/api/items").send({
      title: "Too many images product",
      description: "should fail",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      wanted_tags: ["รูป"],
      images: ["/uploads/1.png", "/uploads/2.png", "/uploads/3.png", "/uploads/4.png", "/uploads/5.png", "/uploads/6.png"]
    });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error).toBe("VALIDATION_ERROR");
  });

  it("keeps multiple uploaded images inside a single product record", async () => {
    const agent = request.agent(app);
    const email = `gallery-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const upload = await agent
      .post("/api/upload")
      .attach("images", Buffer.from("gallery-image-a"), { filename: "a.txt", contentType: "text/plain" })
      .attach("images", Buffer.from("gallery-image-b"), { filename: "b.txt", contentType: "text/plain" });
    expect(upload.status).toBe(200);
    expect(upload.body.urls).toHaveLength(2);

    const created = await agent.post("/api/items").send({
      title: "Gallery product",
      description: "two images one product",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      wanted_tags: ["แกลเลอรี"],
      images: upload.body.urls
    });
    expect(created.status).toBe(201);
    expect(created.body.item.media.images).toHaveLength(2);

    const fetched = await request(app).get(`/api/items/${created.body.item.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.item.media.images).toHaveLength(2);

    const mine = await agent.get(`/api/items?owner_id=${created.body.item.owner.id}`);
    expect(mine.status).toBe(200);
    expect(mine.body.items.filter((item: any) => item.id === created.body.item.id)).toHaveLength(1);
  });

  it("deduplicates repeated create-item requests that share an idempotency key", async () => {
    const agent = request.agent(app);
    const email = `idempotent-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const payload = {
      title: "Idempotent product",
      description: "should only create once",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      wanted_tags: ["ซ้ำ"],
      images: ["/uploads/one.png", "/uploads/two.png"]
    };

    const first = await agent.post("/api/items").set("x-idempotency-key", "product-create-12345").send(payload);
    const second = await agent.post("/api/items").set("x-idempotency-key", "product-create-12345").send(payload);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.item.id).toBe(first.body.item.id);

    const mine = await agent.get(`/api/items?owner_id=${first.body.item.owner.id}`);
    expect(mine.status).toBe(200);
    expect(mine.body.items.filter((item: any) => item.title === "Idempotent product")).toHaveLength(1);
  });

  it("deposits credits, records a transaction, and rejects invalid deposit amounts", async () => {
    const agent = request.agent(app);
    const email = `wallet-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    const before = await agent.get("/api/wallet");
    expect(before.status).toBe(200);
    const startingBalance = Number(before.body.wallet.credit_balance || 0);

    const invalid = await agent.post("/api/wallet/deposit").send({ amount: 25 });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toBe("VALIDATION_ERROR");

    const deposit = await agent.post("/api/wallet/deposit").send({ amount: 250 });
    expect(deposit.status).toBe(200);
    expect(deposit.body.wallet.credit_balance).toBe(startingBalance + 250);

    const transactions = await agent.get("/api/transactions");
    expect(transactions.status).toBe(200);
    expect(transactions.body.transactions[0].type).toBe("deposit");
    expect(transactions.body.transactions[0].amount).toBe(250);
    expect(transactions.body.transactions[0].description).toContain("250");
  });

  it("persists profile avatar after signout and re-login", async () => {
    const agent = request.agent(app);
    const email = `profile-${Date.now()}@qxwap.app`;
    const password = "password123";
    const signup = await agent.post("/api/auth/signup").send({ email, password });
    expect(signup.status).toBe(201);

    const upload = await agent
      .post("/api/upload")
      .attach("images", Buffer.from("qxwap-profile-avatar"), { filename: "avatar.txt", contentType: "text/plain" });
    expect(upload.status).toBe(200);
    expect(upload.body.urls[0]).toBeTruthy();

    const patch = await agent.patch("/api/profiles/me").send({
      display_name: "Avatar QA",
      avatar_url: upload.body.urls[0]
    });
    expect(patch.status).toBe(200);
    expect(patch.body.profile.avatar_url).toBe(upload.body.urls[0]);

    const signout = await agent.post("/api/auth/signout");
    expect(signout.status).toBe(200);

    const signin = await agent.post("/api/auth/signin").send({ email, password });
    expect(signin.status).toBe(200);
    expect(signin.body.user.avatar_url).toBe(upload.body.urls[0]);

    const me = await agent.get("/api/profiles/me");
    expect(me.status).toBe(200);
    expect(me.body.profile.display_name).toBe("Avatar QA");
    expect(me.body.profile.avatar_url).toBe(upload.body.urls[0]);

    const publicProfile = await request(app).get(`/api/profiles/${signin.body.user.id}`);
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.profile.avatar_url).toBe(upload.body.urls[0]);
  });

  it("only allows offer participants to manage shipments and deduplicates shipment start", async () => {
    const owner = request.agent(app);
    const requester = request.agent(app);
    const outsider = request.agent(app);
    const stamp = Date.now();

    await owner.post("/api/auth/signup").send({ email: `ship-owner-${stamp}@qxwap.app`, password: "password123" });
    await requester.post("/api/auth/signup").send({ email: `ship-requester-${stamp}@qxwap.app`, password: "password123" });
    await outsider.post("/api/auth/signup").send({ email: `ship-outsider-${stamp}@qxwap.app`, password: "password123" });

    const created = await owner.post("/api/items").send({
      title: "Shipment protected item",
      description: "shipment permission regression",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      open_to_offers: true,
      wanted_tags: ["shipment"]
    });
    expect(created.status).toBe(201);

    const offer = await requester.post("/api/offers").send({
      target_item_id: created.body.item.id,
      message: "พร้อมแลก",
      instant_swap: true,
      shipping_payer: "split",
      pickup_window: "วันนี้ 18:00-20:00"
    });
    expect(offer.status).toBe(201);

    const accept = await owner.post(`/api/offers/${offer.body.offer_id}/accept`).send({});
    expect(accept.status).toBe(200);

    const forbiddenStart = await outsider.post(`/api/shipments/${offer.body.offer_id}/start`).send({ tracking_number: "OUTSIDE-1" });
    expect(forbiddenStart.status).toBe(403);

    const start = await requester.post(`/api/shipments/${offer.body.offer_id}/start`).send({ tracking_number: "QX-SHIP-1" });
    expect(start.status).toBe(201);
    expect(start.body.shipment.offer_id).toBe(offer.body.offer_id);

    const duplicateStart = await requester.post(`/api/shipments/${offer.body.offer_id}/start`).send({ tracking_number: "QX-SHIP-1" });
    expect(duplicateStart.status).toBe(200);
    expect(duplicateStart.body.shipment.id).toBe(start.body.shipment.id);

    const tooEarlyConfirm = await requester.post(`/api/offers/${offer.body.offer_id}/confirm`).send({});
    expect(tooEarlyConfirm.status).toBe(400);

    const forbiddenUpdate = await outsider.post(`/api/shipments/${start.body.shipment.id}/update-step`).send({ current_step: "picked_up" });
    expect(forbiddenUpdate.status).toBe(403);

    const allowedUpdate = await owner.post(`/api/shipments/${start.body.shipment.id}/update-step`).send({ current_step: "picked_up" });
    expect(allowedUpdate.status).toBe(200);

    const invalidFinish = await requester.post(`/api/shipments/${start.body.shipment.id}/finish`).send({});
    expect(invalidFinish.status).toBe(409);

    const invalidJump = await owner.post(`/api/shipments/${start.body.shipment.id}/update-step`).send({ current_step: "finished" });
    expect(invalidJump.status).toBe(409);

    const transit = await requester.post(`/api/shipments/${start.body.shipment.id}/update-step`).send({ current_step: "in_transit" });
    expect(transit.status).toBe(200);

    const forbiddenFinish = await outsider.post(`/api/shipments/${start.body.shipment.id}/finish`).send({});
    expect(forbiddenFinish.status).toBe(403);

    const finish = await owner.post(`/api/shipments/${start.body.shipment.id}/finish`).send({});
    expect(finish.status).toBe(200);

    const confirm = await requester.post(`/api/offers/${offer.body.offer_id}/confirm`).send({});
    expect(confirm.status).toBe(200);

    const requesterWallet = await requester.get("/api/wallet");
    const ownerWallet = await owner.get("/api/wallet");
    expect(requesterWallet.status).toBe(200);
    expect(ownerWallet.status).toBe(200);
    expect(Number(requesterWallet.body.wallet.credit_balance || 0)).toBeGreaterThanOrEqual(200);
    expect(Number(ownerWallet.body.wallet.credit_balance || 0)).toBeGreaterThanOrEqual(200);
  });

  it("exposes offer detail and only unlocks chat after the offer is accepted", async () => {
    const owner = request.agent(app);
    const requester = request.agent(app);
    const stamp = Date.now();

    await owner.post("/api/auth/signup").send({ email: `offer-detail-owner-${stamp}@qxwap.app`, password: "password123" });
    await requester.post("/api/auth/signup").send({ email: `offer-detail-requester-${stamp}@qxwap.app`, password: "password123" });

    const created = await owner.post("/api/items").send({
      title: "Offer detail target item",
      description: "used for detail/chat test",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      wanted_tags: ["ข้อเสนอ"],
      location_label: "อารีย์"
    });
    expect(created.status).toBe(201);

    const offer = await requester.post("/api/offers").send({
      target_item_id: created.body.item.id,
      message: "สนใจคุยรายละเอียดเพิ่มครับ",
      instant_swap: true,
      shipping_payer: "split",
      pickup_window: "เสาร์ 10:00-12:00"
    });
    expect(offer.status).toBe(201);

    const pendingDetail = await requester.get(`/api/offers/${offer.body.offer_id}/detail`);
    expect(pendingDetail.status).toBe(200);
    expect(pendingDetail.body.chat_enabled).toBe(false);
    expect(pendingDetail.body.target_item.id).toBe(created.body.item.id);

    const lockedMessages = await requester.get(`/api/chat/conversations/${offer.body.conversation_id}/messages`);
    expect(lockedMessages.status).toBe(403);
    expect(lockedMessages.body.error).toBe("CHAT_LOCKED");

    const accept = await owner.post(`/api/offers/${offer.body.offer_id}/accept`).send({});
    expect(accept.status).toBe(200);

    const acceptedDetail = await requester.get(`/api/offers/${offer.body.offer_id}/detail`);
    expect(acceptedDetail.status).toBe(200);
    expect(acceptedDetail.body.chat_enabled).toBe(true);

    const sent = await requester.post(`/api/chat/conversations/${offer.body.conversation_id}/messages`).send({ text: "นัดรับที่อารีย์ได้ไหมครับ" });
    expect(sent.status).toBe(201);

    const ownerMessages = await owner.get(`/api/chat/conversations/${offer.body.conversation_id}/messages`);
    expect(ownerMessages.status).toBe(200);
    expect(ownerMessages.body.messages.some((message: any) => message.text.includes("อารีย์"))).toBe(true);
  });

  it("deletes the signed-in account and clears the active session", async () => {
    const agent = request.agent(app);
    const email = `delete-me-${Date.now()}@qxwap.app`;
    const password = "password123";
    const signup = await agent.post("/api/auth/signup").send({ email, password });
    expect(signup.status).toBe(201);
    const userId = signup.body.user.id;

    const remove = await agent.delete("/api/auth/account");
    expect(remove.status).toBe(200);
    expect(remove.body.ok).toBe(true);

    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user).toBeNull();

    const publicProfile = await request(app).get(`/api/profiles/${userId}`);
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.profile).toBeNull();

    const signin = await request(app).post("/api/auth/signin").send({ email, password });
    expect(signin.status).toBe(401);
  });

  it("enforces owner-only item edit/delete and exposes correct viewer ownership", async () => {
    const owner = request.agent(app);
    const other = request.agent(app);
    const ownerEmail = `owner-${Date.now()}@qxwap.app`;
    const otherEmail = `other-${Date.now()}@qxwap.app`;

    const ownerSignup = await owner.post("/api/auth/signup").send({ email: ownerEmail, password: "password123" });
    expect(ownerSignup.status).toBe(201);
    const otherSignup = await other.post("/api/auth/signup").send({ email: otherEmail, password: "password123" });
    expect(otherSignup.status).toBe(201);

    const created = await owner.post("/api/items").send({
      title: "Owner permission item",
      description: "permissions automated test",
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      price_cash: 0,
      price_credit: 0,
      open_to_offers: true,
      wanted_text: "permission safe offer",
      wanted_tags: ["สิทธิ์"],
      location_label: "QA"
    });
    expect(created.status).toBe(201);
    expect(created.body.item.viewer.is_owner).toBe(true);

    const ownerDetail = await owner.get(`/api/items/${created.body.item.id}`);
    expect(ownerDetail.status).toBe(200);
    expect(ownerDetail.body.item.viewer.is_owner).toBe(true);

    const otherDetail = await other.get(`/api/items/${created.body.item.id}`);
    expect(otherDetail.status).toBe(200);
    expect(otherDetail.body.item.viewer.is_owner).toBe(false);

    const guestDetail = await request(app).get(`/api/items/${created.body.item.id}`);
    expect(guestDetail.status).toBe(200);
    expect(guestDetail.body.item.viewer.is_owner).toBe(false);

    const forbiddenPatch = await other.patch(`/api/items/${created.body.item.id}`).send({ title: "Bad edit" });
    expect(forbiddenPatch.status).toBe(403);

    const forbiddenDelete = await other.delete(`/api/items/${created.body.item.id}`);
    expect(forbiddenDelete.status).toBe(403);

    const ownerPatch = await owner.patch(`/api/items/${created.body.item.id}`).send({ title: "Owner edited item" });
    expect(ownerPatch.status).toBe(200);
    expect(ownerPatch.body.item.title).toBe("Owner edited item");

    const ownerDelete = await owner.delete(`/api/items/${created.body.item.id}`);
    expect(ownerDelete.status).toBe(200);
    expect(ownerDelete.body.ok).toBe(true);

    const afterDelete = await request(app).get(`/api/items/${created.body.item.id}`);
    expect(afterDelete.status).toBe(404);
  });

  it("marks notifications as read without a uuid cast (cross-dialect safe)", async () => {
    // Regression guard: the earlier implementation used
    // `($2::uuid IS NULL OR id=$2)` which works on PGlite (uuid id) but
    // throws "operator does not exist: text = uuid" on Postgres where id
    // is TEXT. The current implementation branches in app code, so this
    // should succeed on every dialect.
    const agent = request.agent(app);
    const email = `notif-${Date.now()}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    // mark-all-read: no body.id
    const all = await agent.post("/api/notifications/read").send({});
    expect(all.status).toBe(200);
    expect(all.body.ok).toBe(true);

    // mark-one-read with explicit (random) id should not throw type errors
    const one = await agent.post("/api/notifications/read").send({ id: "00000000-0000-0000-0000-000000000000" });
    expect(one.status).toBe(200);
    expect(one.body.ok).toBe(true);
  });

  it("rate-limits /api/auth/signup to 5 requests/min with 429 + retry-after when forced", async () => {
    // The rate limiter is normally skipped under NODE_ENV=test. Temporarily
    // flip the flag for this test only so we exercise the 429 path.
    const prev = process.env.FORCE_RATE_LIMIT;
    process.env.FORCE_RATE_LIMIT = "1";
    try {
      const stamp = Date.now();
      const responses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const res = await request(app)
          .post("/api/auth/signup")
          .send({ email: `rl-${stamp}-${i}@qxwap.app`, password: "password123" });
        responses.push(res.status);
        if (i === 5) {
          expect(res.status).toBe(429);
          expect(res.body.error).toBe("RATE_LIMITED");
          expect(typeof res.body.retry_after_sec).toBe("number");
          expect(res.headers["retry-after"]).toBeTruthy();
          expect(res.headers["x-ratelimit-limit"]).toBe("5");
          expect(res.headers["x-ratelimit-remaining"]).toBe("0");
        }
      }
      // First 5 should succeed (201) and the 6th must be 429
      expect(responses.slice(0, 5).every((s) => s === 201)).toBe(true);
      expect(responses[5]).toBe(429);
    } finally {
      if (prev === undefined) delete process.env.FORCE_RATE_LIMIT;
      else process.env.FORCE_RATE_LIMIT = prev;
    }
  });

  it("filters items by q, category, condition, deal_type, wanted_tag, and combinations", async () => {
    const seeder = request.agent(app);
    const seederEmail = `filter-${Date.now()}@qxwap.app`;
    const seederSignup = await seeder.post("/api/auth/signup").send({ email: seederEmail, password: "password123" });
    expect(seederSignup.status).toBe(201);

    const stamp = Date.now();
    const uniqA = `QXWAPFLTA${stamp}`;
    const uniqB = `QXWAPFLTB${stamp}`;
    const wantedTag = `qxwap_wanted_${stamp}`;

    const itemA = await seeder.post("/api/items").send({
      title: `${uniqA} Vintage Camera`,
      description: "rare film camera for QA filter test",
      category: "Electronics",
      condition: "Good",
      deal_type: "swap",
      open_to_offers: true,
      wanted_text: "เลนส์มือสองสภาพดี",
      wanted_tags: [wantedTag, "เลนส์"],
      location_label: "QA Lab"
    });
    expect(itemA.status).toBe(201);

    const itemB = await seeder.post("/api/items").send({
      title: `${uniqB} Mountain Bike`,
      description: "alloy frame bike for outdoor",
      category: "Sports",
      condition: "Fair",
      deal_type: "sell",
      price_cash: 4500,
      open_to_offers: false,
      wanted_text: "เงินสด",
      wanted_tags: ["bike"],
      location_label: "QA Lab"
    });
    expect(itemB.status).toBe(201);

    // 1. Search q matches title exactly
    const byTitle = await request(app).get(`/api/items?q=${encodeURIComponent(uniqA)}`);
    expect(byTitle.status).toBe(200);
    expect(byTitle.body.items.length).toBe(1);
    expect(byTitle.body.items[0].title).toContain(uniqA);

    // 2. Search + matching category narrows correctly
    const byCategory = await request(app).get(`/api/items?q=${encodeURIComponent(uniqA)}&category=Electronics`);
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.items.length).toBe(1);
    expect(byCategory.body.items[0].category).toBe("Electronics");

    // 3. Search + mismatched category returns empty (filters AND together)
    const byCategoryMiss = await request(app).get(`/api/items?q=${encodeURIComponent(uniqA)}&category=Sports`);
    expect(byCategoryMiss.status).toBe(200);
    expect(byCategoryMiss.body.items.length).toBe(0);

    // 4. wanted_tag filter only returns items whose wanted_tags contains the tag
    const byWantedTag = await request(app).get(`/api/items?wanted_tag=${encodeURIComponent(wantedTag)}`);
    expect(byWantedTag.status).toBe(200);
    expect(byWantedTag.body.items.length).toBe(1);
    expect(byWantedTag.body.items[0].wanted.tags).toContain(wantedTag);

    // 5. condition filter
    const byCondition = await request(app).get(`/api/items?q=${encodeURIComponent(uniqB)}&condition=Fair`);
    expect(byCondition.status).toBe(200);
    expect(byCondition.body.items.length).toBe(1);
    expect(byCondition.body.items[0].condition).toBe("Fair");

    // 6. deal_type filter
    const byDealType = await request(app).get(`/api/items?q=${encodeURIComponent(uniqB)}&deal_type=sell`);
    expect(byDealType.status).toBe(200);
    expect(byDealType.body.items.length).toBe(1);
    expect(byDealType.body.items[0].deal.type).toBe("sell");

    // 6b. combined query params stay ANDed together and include price/open filters
    const combined = await request(app)
      .get("/api/items")
      .query({
        q: uniqB,
        category: "Sports",
        condition: "Fair",
        deal_type: "sell",
        min_price: "4000",
        max_price: "5000",
        sort: "price_desc"
      });
    expect(combined.status).toBe(200);
    expect(combined.body.items.length).toBe(1);
    expect(combined.body.items[0].id).toBe(itemB.body.item.id);

    const openOffers = await request(app).get(`/api/items?q=${encodeURIComponent(uniqA)}&open_to_offers=true`);
    expect(openOffers.status).toBe(200);
    expect(openOffers.body.items.length).toBe(1);
    expect(openOffers.body.items[0].deal.open_to_offers).toBe(true);

    // 7. q matches description text too
    const byDescription = await request(app).get(`/api/items?q=${encodeURIComponent("alloy frame bike for outdoor")}`);
    expect(byDescription.status).toBe(200);
    expect(byDescription.body.items.some((i: any) => i.title.includes(uniqB))).toBe(true);

    // 8. q matches wanted_text (Thai)
    const byWantedText = await request(app).get(`/api/items?q=${encodeURIComponent("เลนส์มือสองสภาพดี")}`);
    expect(byWantedText.status).toBe(200);
    expect(byWantedText.body.items.some((i: any) => i.title.includes(uniqA))).toBe(true);

    // 9. No-match search returns empty (not all items)
    const empty = await request(app).get(`/api/items?q=${encodeURIComponent("QXWAP_NEVER_EXISTS_XYZ_NOPE")}`);
    expect(empty.status).toBe(200);
    expect(empty.body.items.length).toBe(0);
  });

  it("paginates items in pages of 20 and exposes page metadata", async () => {
    const agent = request.agent(app);
    const stamp = Date.now();
    const email = `paging-${stamp}@qxwap.app`;
    const signup = await agent.post("/api/auth/signup").send({ email, password: "password123" });
    expect(signup.status).toBe(201);

    for (let i = 0; i < 23; i++) {
      const created = await agent.post("/api/items").send({
        title: `Paging item ${stamp}-${i}`,
        description: "pagination regression test",
        category: "Other",
        condition: "Good",
        deal_type: "swap",
        open_to_offers: true,
        wanted_tags: [`paging-${stamp}`]
      });
      expect(created.status).toBe(201);
    }

    const firstPage = await request(app).get("/api/items").query({ q: `paging-${stamp}`, limit: "20", offset: "0" });
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items).toHaveLength(20);
    expect(firstPage.body.page.limit).toBe(20);
    expect(firstPage.body.page.offset).toBe(0);
    expect(firstPage.body.page.has_more).toBe(true);
    expect(firstPage.body.page.next_offset).toBe(20);

    const secondPage = await request(app).get("/api/items").query({ q: `paging-${stamp}`, limit: "20", offset: "20" });
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.items).toHaveLength(3);
    expect(secondPage.body.page.has_more).toBe(false);
    expect(secondPage.body.page.next_offset).toBeNull();
  });

  it("prioritizes followed sellers in ai feed ordering", async () => {
    const viewer = request.agent(app);
    const ownerA = request.agent(app);
    const ownerB = request.agent(app);
    const stamp = Date.now();

    expect((await viewer.post("/api/auth/signup").send({ email: `viewer-ai-${stamp}@qxwap.app`, password: "password123" })).status).toBe(201);
    expect((await ownerA.post("/api/auth/signup").send({ email: `owner-a-${stamp}@qxwap.app`, password: "password123" })).status).toBe(201);
    expect((await ownerB.post("/api/auth/signup").send({ email: `owner-b-${stamp}@qxwap.app`, password: "password123" })).status).toBe(201);

    const itemA = await ownerA.post("/api/items").send({
      title: `AI rank followed ${stamp}`,
      description: `AI rank followed ${stamp}`,
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      open_to_offers: true,
      wanted_tags: [`ai-rank-${stamp}`]
    });
    expect(itemA.status).toBe(201);

    const itemB = await ownerB.post("/api/items").send({
      title: `AI rank unfollowed ${stamp}`,
      description: `AI rank unfollowed ${stamp}`,
      category: "Other",
      condition: "Good",
      deal_type: "swap",
      open_to_offers: true,
      wanted_tags: [`ai-rank-${stamp}`]
    });
    expect(itemB.status).toBe(201);

    const follow = await viewer.post(`/api/follows/${itemA.body.item.owner.id}`).send({});
    expect(follow.status).toBe(200);

    const feed = await viewer.get("/api/feed").query({ q: `ai-rank-${stamp}`, limit: "20" });
    expect(feed.status).toBe(200);
    expect(feed.body.items).toHaveLength(2);
    expect(feed.body.items[0].id).toBe(itemA.body.item.id);
    expect(feed.body.items[1].id).toBe(itemB.body.item.id);
  });
});
