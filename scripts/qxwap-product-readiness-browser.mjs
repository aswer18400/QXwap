#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { chromium, firefox, webkit } from "playwright";

const stamp = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL || "http://127.0.0.1:5174/");
const apiBase = normalizeApiBase(process.env.API_BASE_URL || "http://127.0.0.1:8787/api");
const reportDir = path.resolve(process.env.PRODUCT_READINESS_REPORT_DIR || "/tmp/qxwap-product-readiness");
const screenshotDir = path.join(reportDir, "screenshots");
const outputJsonPath = process.env.PRODUCT_READINESS_BROWSER_JSON
  ? path.resolve(process.env.PRODUCT_READINESS_BROWSER_JSON)
  : path.join(reportDir, "browser-latest.json");
const navigationTimeoutMs = Number(process.env.PRODUCT_READINESS_BROWSER_NAV_TIMEOUT_MS || 20_000);
const actionTimeoutMs = Number(process.env.PRODUCT_READINESS_BROWSER_ACTION_TIMEOUT_MS || 15_000);
const overallTimeoutMs = Number(process.env.PRODUCT_READINESS_BROWSER_TIMEOUT_MS || 5 * 60 * 1000);

const DEFAULT_VIEWPORT = { width: 1440, height: 1024 };
const breakpointViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 1024 },
  { name: "ultrawide", width: 1728, height: 1117 }
];

const browserTargets = [
  { label: "Chrome", kind: "chromium", launch: () => chromium.launch({ channel: "chrome", headless: true }) },
  { label: "Safari", kind: "webkit", launch: () => webkit.launch({ headless: true }) },
  { label: "Firefox", kind: "firefox", launch: () => firefox.launch({ headless: true }) },
  { label: "Edge", kind: "chromium", launch: () => chromium.launch({ channel: "msedge", headless: true }) }
];
const activeBrowsers = new Set();

function normalizeFrontendUrl(raw) {
  const url = new URL(String(raw || "").trim());
  if (!url.pathname || url.pathname === "") url.pathname = "/";
  return url.toString();
}

function normalizeApiBase(raw) {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function toPageUrl(route = "") {
  return new URL(route, frontendUrl).toString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchTrackedBrowser(launcher) {
  const browser = await launcher();
  activeBrowsers.add(browser);
  browser.on("disconnected", () => activeBrowsers.delete(browser));
  return browser;
}

async function closeTrackedBrowser(browser) {
  if (!browser) return;
  try {
    await browser.close();
  } catch {
    // ignore
  } finally {
    activeBrowsers.delete(browser);
  }
}

async function closeAllTrackedBrowsers() {
  await Promise.all(Array.from(activeBrowsers, (browser) => closeTrackedBrowser(browser)));
}

async function withOverallTimeout(work) {
  let timeoutHandle;
  try {
    return await Promise.race([
      work(),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`browser audit exceeded ${overallTimeoutMs}ms timeout`));
        }, overallTimeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function retryAfterMs(headers) {
  const raw = headers.get("retry-after");
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds * 1000 + 1000, 65000) : 5000;
}

async function ensureDirs() {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(screenshotDir, { recursive: true });
}

function cookieToPlaywright(rawCookie, targetUrl) {
  const [pair] = String(rawCookie || "").split(";");
  const [name, ...rest] = pair.split("=");
  return {
    name,
    value: rest.join("="),
    url: targetUrl,
    httpOnly: false,
    sameSite: "Lax"
  };
}

class ApiAgent {
  constructor(label) {
    this.label = label;
    this.cookie = "";
  }

  captureCookie(headers) {
    const headerList = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
    for (const rawCookie of headerList) {
      const match = String(rawCookie).match(/(?:^|,\s*)(qxwap\.sid=[^;]+|connect\.sid=[^;]+)/);
      if (match) this.cookie = match[1];
    }
  }

  async request(pathname, init = {}) {
    const headers = new Headers(init.headers || {});
    if (this.cookie) headers.set("cookie", this.cookie);
    if (init.body && !(init.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    let response;
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetch(`${apiBase}${pathname}`, { ...init, headers });
      this.captureCookie(response.headers);
      if (!(pathname === "/auth/signup" && response.status === 429 && attempt < 2)) break;
      await sleep(retryAfterMs(response.headers));
    }
    const text = await response.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    return { status: response.status, body, text };
  }

  get(pathname) {
    return this.request(pathname);
  }

  post(pathname, body) {
    return this.request(pathname, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body || {})
    });
  }

  patch(pathname, body) {
    return this.request(pathname, {
      method: "PATCH",
      body: JSON.stringify(body || {})
    });
  }
}

async function createScenario() {
  const seller = new ApiAgent("seller");
  const buyer = new ApiAgent("buyer");
  const sellerEmail = `browser-seller-${stamp}@qxwap.app`;
  const buyerEmail = `browser-buyer-${stamp}@qxwap.app`;
  const password = "password123";

  const sellerSignup = await seller.post("/auth/signup", { email: sellerEmail, password });
  if (sellerSignup.status !== 201) throw new Error(`seller signup failed: ${sellerSignup.text}`);
  const created = await seller.post("/items", {
    title: `Browser item ${stamp}`,
    description: "Created by product readiness browser audit",
    category: "Other",
    condition: "Good",
    deal_type: "swap",
    open_to_offers: true,
    wanted_text: "smoke wanted tag",
    wanted_tags: [`browser-${stamp}`],
    location_label: "Browser QA"
  });
  if (created.status !== 201 || !created.body?.item?.id) throw new Error(`item create failed: ${created.text}`);

  const buyerSignup = await buyer.post("/auth/signup", { email: buyerEmail, password });
  if (buyerSignup.status !== 201) throw new Error(`buyer signup failed: ${buyerSignup.text}`);
  const offer = await buyer.post("/offers", {
    target_item_id: created.body.item.id,
    message: "Browser offer flow",
    cash_amount: 25,
    credit_amount: 10,
    item_ids: [],
    instant_swap: true,
    shipping_payer: "split",
    pickup_window: "คืนนี้ 19:00-20:00"
  });
  if (offer.status !== 201 || !offer.body?.offer_id) throw new Error(`offer create failed: ${offer.text}`);

  const accept = await seller.post(`/offers/${offer.body.offer_id}/accept`, {});
  const approve = await buyer.post(`/offers/${offer.body.offer_id}/approve`, {});
  if (accept.status !== 200 || approve.status !== 200) {
    throw new Error(`offer accept/approve failed: ${accept.text} :: ${approve.text}`);
  }

  return {
    sellerCookie: seller.cookie,
    buyerCookie: buyer.cookie,
    sellerUserId: sellerSignup.body?.user?.id,
    buyerUserId: buyerSignup.body?.user?.id,
    itemId: created.body.item.id,
    offerId: offer.body.offer_id
  };
}

async function takeShot(page, name) {
  const filePath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  return filePath;
}

async function waitForAppReady(page) {
  await page.waitForTimeout(2400);
  const splashText = await page.locator("body").innerText().catch(() => "");
  if (/กำลังเตรียม|กำลังโหลด/.test(splashText)) {
    await page.waitForTimeout(1200);
  }
}

async function collectConsole(page) {
  const entries = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      entries.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    entries.push({ type: "pageerror", text: error.message });
  });
  return entries;
}

function isFrameworkOverlayText(text) {
  return [
    "vite",
    "failed to fetch dynamically imported module",
    "cannot read properties of undefined",
    "hydration failed",
    "rendered more hooks than during the previous render"
  ].some((needle) => text.toLowerCase().includes(needle));
}

async function pageAudit(page, label) {
  const domText = await page.locator("body").innerText().catch(() => "");
  const nav = await page.evaluate(() => {
    const [entry] = performance.getEntriesByType("navigation");
    if (!entry) return { domContentLoadedMs: null, loadMs: null };
    return {
      domContentLoadedMs: Number(entry.domContentLoadedEventEnd.toFixed(2)),
      loadMs: Number(entry.loadEventEnd.toFixed(2))
    };
  }).catch(() => ({ domContentLoadedMs: null, loadMs: null }));
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1).catch(() => true);
  const unlabeledControls = await page.evaluate(() => {
    const interactive = Array.from(document.querySelectorAll("button, a, input, textarea, select"))
      .filter((node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true");
    return interactive
      .map((node) => {
        const text = node.textContent?.replace(/\s+/g, " ").trim() || "";
        const aria = node.getAttribute("aria-label") || "";
        const labelledBy = node.getAttribute("aria-labelledby") || "";
        const placeholder = node.getAttribute("placeholder") || "";
        const title = node.getAttribute("title") || "";
        return {
          tag: node.tagName.toLowerCase(),
          text,
          aria,
          labelledBy,
          placeholder,
          title
        };
      })
      .filter((item) => !item.text && !item.aria && !item.labelledBy && !item.placeholder && !item.title)
      .slice(0, 10);
  }).catch(() => []);

  return {
    label,
    domTextLength: domText.length,
    hasFrameworkOverlay: isFrameworkOverlayText(domText),
    horizontalOverflow,
    unlabeledControls,
    ...nav
  };
}

async function runRoute(browserLabel, browser, route, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || DEFAULT_VIEWPORT
  });
  context.setDefaultTimeout(actionTimeoutMs);
  context.setDefaultNavigationTimeout(navigationTimeoutMs);
  if (options.cookie) {
    await context.addCookies([cookieToPlaywright(options.cookie, frontendUrl)]);
  }
  const page = await context.newPage();
  page.setDefaultTimeout(actionTimeoutMs);
  page.setDefaultNavigationTimeout(navigationTimeoutMs);
  const consoleEntries = await collectConsole(page);
  await page.goto(toPageUrl(route), { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  const audit = await pageAudit(page, `${browserLabel}:${route}`);
  const screenshot = await takeShot(page, `${browserLabel}-${route.replace(/[^a-z0-9]+/gi, "-")}-${(options.viewport?.width || DEFAULT_VIEWPORT.width)}`);
  await context.close();
  return { route, audit, consoleEntries, screenshot, browserLabel, viewport: options.viewport || DEFAULT_VIEWPORT };
}

async function runCompatibilitySweep(scenario, findings) {
  const results = [];
  for (const target of browserTargets) {
    let browser;
    try {
      browser = await launchTrackedBrowser(target.launch);
    } catch (error) {
      findings.push({
        title: `${target.label} compatibility sweep unavailable`,
        hypothesis: `${target.label} regression อาจหลุดรอดเพราะ environment นี้ไม่มี browser target พร้อมใช้`,
        steps: [`เปิด ${target.label} ผ่าน Playwright channel ของ loop`],
        expected: `${target.label} ต้องเปิดได้เพื่อรัน compatibility sweep`,
        actual: `${target.label} เปิดไม่ได้ใน environment นี้: ${error instanceof Error ? error.message : String(error)}`,
        severity: target.label === "Edge" ? "minor" : "major",
        screenshot: null,
        log: null,
        suggestion: "ติดตั้ง browser target หรือปรับ runner machine ให้มี channel นี้พร้อม",
        tags: ["browser-compatibility", target.label.toLowerCase()]
      });
      continue;
    }

    const home = await runRoute(target.label, browser, "/");
    const shop = await runRoute(target.label, browser, "/?view=shop");
    results.push(home, shop);

    for (const entry of [home, shop]) {
      if (entry.audit.domTextLength < 80 || entry.audit.hasFrameworkOverlay) {
        findings.push({
          title: `${target.label} route render failed on ${entry.route}`,
          hypothesis: "ผู้ใช้จะ drop-off เมื่อหน้าแรกหรือหน้าร้านไม่ขึ้น content จริงใน browser นั้น",
          steps: [`เปิด ${entry.route} บน ${target.label}`],
          expected: "หน้า render content จริง ไม่มี framework overlay และไม่ blank",
          actual: `domTextLength=${entry.audit.domTextLength}, overlay=${entry.audit.hasFrameworkOverlay}`,
          severity: "critical",
          screenshot: entry.screenshot,
          log: entry.consoleEntries,
          suggestion: "ตรวจ runtime errors, lazy imports, และ browser-specific CSS/JS ใน route นี้",
          tags: ["browser-compatibility", "render", target.label.toLowerCase()]
        });
      }
      if (entry.audit.horizontalOverflow) {
        findings.push({
          title: `${target.label} has horizontal overflow on ${entry.route}`,
          hypothesis: "layout แตกหรือมี CTA หลุดเฟรมใน browser compatibility sweep",
          steps: [`เปิด ${entry.route} บน ${target.label}`],
          expected: "ไม่มี horizontal overflow ใน first viewport",
          actual: "document scroll width กว้างกว่า viewport",
          severity: "major",
          screenshot: entry.screenshot,
          log: entry.consoleEntries,
          suggestion: "เก็บ width/nowrap/absolute positioning ของ shell และ cards บน browser นี้",
          tags: ["browser-compatibility", "layout", target.label.toLowerCase()]
        });
      }
    }
    await closeTrackedBrowser(browser);
  }
  return results;
}

async function runBreakpointSweep(scenario, findings) {
  const browser = await launchTrackedBrowser(() => chromium.launch({ headless: true }));
  const results = [];
  const routes = [
    { route: "/", label: "home" },
    { route: "/?view=shop", label: "shop" },
    { route: "/?view=add", label: "add-guest" },
    { route: "/?view=profile_edit", label: "profile-edit-guest" }
  ];

  for (const viewport of breakpointViewports) {
    for (const target of routes) {
      const result = await runRoute("Chromium", browser, target.route, { viewport });
      results.push(result);
      if (result.audit.horizontalOverflow) {
        findings.push({
          title: `${target.label} overflows on ${viewport.name}`,
          hypothesis: "responsive layout ยังไม่ stable ใน breakpoint นี้",
          steps: [`เปิด ${target.route} บน viewport ${viewport.width}x${viewport.height}`],
          expected: "content ต้องอยู่ใน viewport โดยไม่ต้อง scroll แนวนอน",
          actual: "พบ horizontal overflow",
          severity: viewport.name === "mobile" ? "critical" : "major",
          screenshot: result.screenshot,
          log: result.consoleEntries,
          suggestion: "ตรวจ nowrap, fixed widths, bottom nav spacing, และ auth/login dock sizing",
          tags: ["responsive", viewport.name, target.label]
        });
      }
    }
  }

  // Mobile authenticated flow.
  const authRoutes = [
    { route: "/?view=notifications", label: "notifications", cookie: scenario.sellerCookie },
    { route: "/?view=profile_edit", label: "profile-edit", cookie: scenario.sellerCookie },
    { route: "/?view=add", label: "add-auth", cookie: scenario.sellerCookie },
    { route: `/?view=chat&offer=${scenario.offerId}`, label: "chat-auth", cookie: scenario.sellerCookie },
    { route: `/?view=offer_detail&offer=${scenario.offerId}`, label: "offer-detail-auth", cookie: scenario.sellerCookie }
  ];
  for (const target of authRoutes) {
    const result = await runRoute("Chromium", browser, target.route, {
      viewport: breakpointViewports[0],
      cookie: target.cookie
    });
    results.push(result);
    if (result.audit.domTextLength < 80 || result.audit.hasFrameworkOverlay) {
      findings.push({
        title: `${target.label} fails in authenticated mobile flow`,
        hypothesis: "ผู้ใช้ที่ล็อกอินบน mobile จะหลุด flow เพราะ route สำคัญไม่โหลดหรือดูเหมือนพัง",
        steps: [`เปิด ${target.route} บน mobile viewport พร้อม session จริง`],
        expected: "route ต้องขึ้น content และ CTA หลักของหน้าตามปกติ",
        actual: `domTextLength=${result.audit.domTextLength}, overlay=${result.audit.hasFrameworkOverlay}`,
        severity: "critical",
        screenshot: result.screenshot,
        log: result.consoleEntries,
        suggestion: "ตรวจ data-loading path, auth state, และ component-level runtime errors ของ route นี้",
        tags: ["mobile", "authenticated", target.label]
      });
    }
  }

  await closeTrackedBrowser(browser);
  return results;
}

async function runA11yAndErrorChecks(scenario, findings) {
  const browser = await launchTrackedBrowser(() => chromium.launch({ headless: true }));
  const results = [];

  const authContext = await browser.newContext({ viewport: breakpointViewports[0] });
  await authContext.addCookies([cookieToPlaywright(scenario.sellerCookie, frontendUrl)]);
  const authPage = await authContext.newPage();
  const authConsole = await collectConsole(authPage);
  authContext.setDefaultTimeout(actionTimeoutMs);
  authContext.setDefaultNavigationTimeout(navigationTimeoutMs);
  authPage.setDefaultTimeout(actionTimeoutMs);
  authPage.setDefaultNavigationTimeout(navigationTimeoutMs);
  await authPage.goto(toPageUrl("/?view=add"), { waitUntil: "domcontentloaded" });
  await waitForAppReady(authPage);
  await authPage.getByRole("button", { name: /บันทึก|ลงสินค้าใหม่|เผยแพร่|โพสต์/i }).click().catch(() => undefined);
  const addErrors = await authPage.locator("[role='alert'], small").allInnerTexts().catch(() => []);
  const addInvalidCount = await authPage.locator("[aria-invalid='true']").count().catch(() => 0);
  const addAudit = await pageAudit(authPage, "a11y:add");
  const addScreenshot = await takeShot(authPage, "a11y-add-invalid");
  results.push({ label: "add-invalid", audit: addAudit, consoleEntries: authConsole, screenshot: addScreenshot });
  if (!addInvalidCount && addErrors.length) {
    findings.push({
      title: "Add item invalid form lacks programmatic field state",
      hypothesis: "ผู้ใช้ assistive tech ไม่รู้ว่าผิดตรงไหนเมื่อ submit add form แบบ invalid",
      steps: [
        "เปิดหน้า add item แบบล็อกอิน",
        "กด submit โดยยังไม่กรอก field บังคับ"
      ],
      expected: "field invalid ต้องมี aria-invalid และ error text ต้องผูกกับ field",
      actual: `มีข้อความ error ${addErrors.length} จุด แต่ aria-invalid นับได้เพียง ${addInvalidCount}`,
      severity: "critical",
      screenshot: addScreenshot,
      log: authConsole,
      suggestion: "เพิ่ม first-invalid focus, aria-invalid, aria-describedby ให้ทุก field error สำคัญ",
      tags: ["accessibility", "forms", "add-item"]
    });
  }
  if (addAudit.unlabeledControls.length) {
    findings.push({
      title: "Unlabeled controls found in add flow",
      hypothesis: "บางปุ่มหรือ input ยังไม่มี accessible name ที่ screen reader ใช้ได้จริง",
      steps: [
        "เปิดหน้า add item",
        "สแกนปุ่ม/ลิงก์/อินพุตที่ไม่มี text, aria-label หรือ placeholder"
      ],
      expected: "ทุก control สำคัญต้องมี accessible name",
      actual: JSON.stringify(addAudit.unlabeledControls),
      severity: "major",
      screenshot: addScreenshot,
      log: authConsole,
      suggestion: "ใส่ aria-label หรือ visible label ให้ controls เหล่านี้",
      tags: ["accessibility", "forms", "labels"]
    });
  }

  const profilePage = await authContext.newPage();
  const profileConsole = await collectConsole(profilePage);
  profilePage.setDefaultTimeout(actionTimeoutMs);
  profilePage.setDefaultNavigationTimeout(navigationTimeoutMs);
  await profilePage.goto(toPageUrl("/?view=profile_edit"), { waitUntil: "domcontentloaded" });
  await waitForAppReady(profilePage);
  await profilePage.keyboard.press("Tab");
  const activeTag = await profilePage.evaluate(() => document.activeElement?.tagName || "NONE");
  const profileScreenshot = await takeShot(profilePage, "a11y-profile-edit");
  results.push({ label: "profile-edit", activeTag, screenshot: profileScreenshot });
  if (activeTag === "BODY" || activeTag === "HTML") {
    findings.push({
      title: "Keyboard focus does not enter profile_edit predictably",
      hypothesis: "keyboard users may lose their position after route change",
      steps: [
        "เปิด profile_edit",
        "กด Tab ครั้งแรก"
      ],
      expected: "focus ต้องเข้าคอนโทรลแรกหรือ heading/back button ที่สื่อความหมาย",
      actual: `activeElement=${activeTag}`,
      severity: "major",
      screenshot: profileScreenshot,
      log: profileConsole,
      suggestion: "วาง initial focus target ที่ชัดหลัง navigation",
      tags: ["accessibility", "focus", "profile-edit"]
    });
  }

  const guestContext = await browser.newContext({ viewport: breakpointViewports[0] });
  const guestPage = await guestContext.newPage();
  const guestConsole = await collectConsole(guestPage);
  guestContext.setDefaultTimeout(actionTimeoutMs);
  guestContext.setDefaultNavigationTimeout(navigationTimeoutMs);
  guestPage.setDefaultTimeout(actionTimeoutMs);
  guestPage.setDefaultNavigationTimeout(navigationTimeoutMs);
  await guestPage.goto(toPageUrl("/"), { waitUntil: "domcontentloaded" });
  await waitForAppReady(guestPage);
  const nestedButtonCount = await guestPage.evaluate(() => document.querySelectorAll("button button, button [role='button']").length).catch(() => 0);
  const feedScreenshot = await takeShot(guestPage, "feed-a11y-structure");
  results.push({ label: "feed-structure", nestedButtonCount, screenshot: feedScreenshot });
  if (nestedButtonCount > 0) {
    findings.push({
      title: "Feed still contains nested interactive controls",
      hypothesis: "nested buttons cause browser and assistive tech activation conflicts on feed cards",
      steps: [
        "เปิด feed",
        "สแกน DOM หาปุ่มที่อยู่ภายในปุ่มหรือ control ที่ซ้อนใน interactive parent"
      ],
      expected: "feed card ต้องไม่มี nested interactive elements ที่ผิด semantics",
      actual: `พบ nested interactive count = ${nestedButtonCount}`,
      severity: "blocker",
      screenshot: feedScreenshot,
      log: guestConsole,
      suggestion: "แยก open action ออกจาก tag/save/xwap controls ให้ semantics ถูกต้อง",
      tags: ["accessibility", "html-semantics", "feed"]
    });
  }

  await guestPage.goto(toPageUrl("/?view=notifications"), { waitUntil: "domcontentloaded" });
  await waitForAppReady(guestPage);
  const guestText = await guestPage.locator("body").innerText().catch(() => "");
  const guestScreenshot = await takeShot(guestPage, "guest-notifications");
  results.push({ label: "notifications-guest", screenshot: guestScreenshot });
  if (!/เข้าสู่ระบบ|QXwap/.test(guestText)) {
    findings.push({
      title: "Unauthorized notifications route lacks a clear guest recovery state",
      hypothesis: "ผู้ใช้ที่ยังไม่ล็อกอินจะไม่เข้าใจว่าหน้านี้ต้องทำอะไรต่อ",
      steps: [
        "เปิด notifications โดยยังไม่เข้าสู่ระบบ"
      ],
      expected: "ควรมี guest gate/login cue ที่ชัด",
      actual: "ไม่พบข้อความเข้าสู่ระบบหรือ guest recovery cue ที่ชัดเจน",
      severity: "major",
      screenshot: guestScreenshot,
      log: guestConsole,
      suggestion: "ใส่ guest state ที่ชัดพร้อม CTA เดียวสำหรับ re-auth",
      tags: ["unauthorized", "notifications", "guest-gate"]
    });
  }

  const errorContext = await browser.newContext({ viewport: DEFAULT_VIEWPORT });
  await errorContext.route("**/api/notifications", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "forced notification failure" })
    })
  );
  await errorContext.addCookies([cookieToPlaywright(scenario.sellerCookie, frontendUrl)]);
  const errorPage = await errorContext.newPage();
  const errorConsole = await collectConsole(errorPage);
  errorContext.setDefaultTimeout(actionTimeoutMs);
  errorContext.setDefaultNavigationTimeout(navigationTimeoutMs);
  errorPage.setDefaultTimeout(actionTimeoutMs);
  errorPage.setDefaultNavigationTimeout(navigationTimeoutMs);
  await errorPage.goto(toPageUrl("/?view=notifications"), { waitUntil: "domcontentloaded" });
  await waitForAppReady(errorPage);
  const errorText = await errorPage.locator("body").innerText().catch(() => "");
  const errorScreenshot = await takeShot(errorPage, "notifications-error");
  results.push({ label: "notifications-error", screenshot: errorScreenshot });
  if (!/forced notification failure|ไม่สำเร็จ|ลองใหม่|แจ้งเตือน/.test(errorText)) {
    findings.push({
      title: "Notifications server error state is not clearly recoverable",
      hypothesis: "ผู้ใช้จะหยุด flow ถ้า notification API ล้มแล้วหน้าไม่บอกว่าเกิดอะไรขึ้น",
      steps: [
        "บังคับ /api/notifications ให้ตอบ 500",
        "เปิดหน้า notifications"
      ],
      expected: "ควรมี error message และ recovery CTA ที่ชัด",
      actual: "ไม่พบข้อความ error/retry ที่อ่านออกชัดจากหน้า",
      severity: "major",
      screenshot: errorScreenshot,
      log: errorConsole,
      suggestion: "แสดง route-level error พร้อม retry action และ preserve context",
      tags: ["error-handling", "notifications", "server-error"]
    });
  }

  const offlineContext = await browser.newContext({ viewport: breakpointViewports[0] });
  const offlinePage = await offlineContext.newPage();
  const offlineConsole = await collectConsole(offlinePage);
  await offlineContext.setOffline(true);
  await offlinePage.goto(toPageUrl("/"), { waitUntil: "commit" }).catch(() => undefined);
  await offlineContext.setOffline(false);
  offlineContext.setDefaultTimeout(actionTimeoutMs);
  offlineContext.setDefaultNavigationTimeout(navigationTimeoutMs);
  offlinePage.setDefaultTimeout(actionTimeoutMs);
  offlinePage.setDefaultNavigationTimeout(navigationTimeoutMs);
  await offlinePage.reload({ waitUntil: "domcontentloaded" }).catch(() => undefined);
  await waitForAppReady(offlinePage);
  const offlineText = await offlinePage.locator("body").innerText().catch(() => "");
  const offlineScreenshot = await takeShot(offlinePage, "offline-recovery-home");
  results.push({ label: "offline-recovery", screenshot: offlineScreenshot });
  if (!offlineText.length) {
    findings.push({
      title: "Offline recovery leaves home blank",
      hypothesis: "ผู้ใช้บนเน็ตแกว่งจะออกจาก flow ทันทีถ้าหน้าแรกฟื้นตัวไม่ได้หลัง reconnect",
      steps: [
        "เปิด home แบบ offline",
        "กลับมา online แล้ว reload"
      ],
      expected: "หน้า home ต้องฟื้นตัวพร้อม state banner หรือ content จริง",
      actual: "หลัง reconnect ยังแทบไม่มี content",
      severity: "critical",
      screenshot: offlineScreenshot,
      log: offlineConsole,
      suggestion: "เพิ่ม offline banner, retry path, และ deterministic recovery after reconnect",
      tags: ["network", "home", "recovery"]
    });
  }

  await authContext.close();
  await guestContext.close();
  await errorContext.close();
  await offlineContext.close();
  await closeTrackedBrowser(browser);
  return results;
}

async function main() {
  await ensureDirs();
  const payload = await withOverallTimeout(async () => {
    const findings = [];
    const scenario = await createScenario();
    const compatibility = await runCompatibilitySweep(scenario, findings);
    const breakpoints = await runBreakpointSweep(scenario, findings);
    const a11y = await runA11yAndErrorChecks(scenario, findings);

    return {
      ok: true,
      generatedAt: new Date().toISOString(),
      frontendUrl,
      apiBase,
      scenario,
      compatibility,
      breakpoints,
      a11y,
      findings
    };
  });

  await fs.writeFile(outputJsonPath, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify(payload, null, 2));
}

main().catch(async (error) => {
  const payload = {
    ok: false,
    generatedAt: new Date().toISOString(),
    frontendUrl,
    apiBase,
    error: error instanceof Error ? error.message : String(error)
  };
  await closeAllTrackedBrowsers().catch(() => undefined);
  await ensureDirs().catch(() => undefined);
  await fs.writeFile(outputJsonPath, JSON.stringify(payload, null, 2)).catch(() => undefined);
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
});
