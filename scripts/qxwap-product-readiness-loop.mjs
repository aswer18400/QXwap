#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyAutoFixQueue } from "./qxwap-product-readiness-autofix.mjs";
import { personas, seededBugReports, countSeverity, severityWeights } from "./qxwap-product-readiness-personas.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = new Set(process.argv.slice(2));
const once = args.has("--once");
const reportDir = path.resolve(process.env.PRODUCT_READINESS_REPORT_DIR || "/tmp/qxwap-product-readiness");
const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL || "http://127.0.0.1:5174/");
const apiBase = normalizeApiBase(process.env.API_BASE_URL || "http://127.0.0.1:8787/api");
const intervalMs = Number(process.env.PRODUCT_READINESS_INTERVAL_MS || 30 * 60 * 1000);
const stopAtIso = process.env.PRODUCT_READINESS_STOP_AT || computeStopAtBangkokNoon();

const logFile = path.join(reportDir, "product-readiness-loop.log");
const latestJson = path.join(reportDir, "latest.json");
const latestMarkdown = path.join(reportDir, "latest.md");
const historyDir = path.join(reportDir, "runs");
const installMarker = path.join(reportDir, ".playwright-installed");
const serviceStatePath = path.join(reportDir, "services.json");
const loopLockPath = path.join(reportDir, "loop.lock.json");
const statusPath = path.join(reportDir, "status.json");
let statusWriteQueue = Promise.resolve();

function normalizeFrontendUrl(raw) {
  const url = new URL(String(raw || "").trim());
  if (!url.pathname) url.pathname = "/";
  return url.toString();
}

function normalizeApiBase(raw) {
  const trimmed = String(raw || "").trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function computeStopAtBangkokNoon() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const currentHour = Number(parts.hour);
  const nextDay = currentHour >= 12 ? 1 : 0;
  const baseUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + nextDay, 5, 0, 0);
  return new Date(baseUtc).toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appleScriptString(value) {
  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function notifyDesktop(title, message) {
  if (process.env.PRODUCT_READINESS_NOTIFY === "0") return;
  const script = `display notification ${appleScriptString(message)} with title ${appleScriptString(title)}`;
  const child = spawn("osascript", ["-e", script], {
    cwd: repoRoot,
    stdio: "ignore",
    detached: true
  });
  child.unref();
}

function isLocalUrl(url) {
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1";
  } catch {
    return false;
  }
}

async function ensureDirs() {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(historyDir, { recursive: true });
}

async function appendLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  await fs.appendFile(logFile, line);
}

async function readStatus() {
  try {
    return JSON.parse(await fs.readFile(statusPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeStatus(partial, { merge = true } = {}) {
  const writeTask = async () => {
    const next = {
      ...(merge ? await readStatus() : {}),
      ...partial,
      lastUpdatedAt: new Date().toISOString()
    };
    const tempPath = `${statusPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(next, null, 2));
    await fs.rename(tempPath, statusPath);
    return next;
  };
  const pending = statusWriteQueue.then(writeTask, writeTask);
  statusWriteQueue = pending.catch(() => undefined);
  return pending;
}

async function heartbeat(event, payload = {}) {
  const entry = {
    ok: true,
    ts: new Date().toISOString(),
    pid: process.pid,
    event,
    ...payload
  };
  console.log(JSON.stringify(entry));
  await writeStatus({ event, ...payload });
  return entry;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isApiHealthy() {
  try {
    const response = await fetchWithTimeout(`${apiBase}/health`, 8000);
    if (!response.ok) return false;
    const json = await response.json();
    return json.ok === true;
  } catch {
    return false;
  }
}

async function isFrontendHealthy() {
  try {
    const response = await fetchWithTimeout(frontendUrl, 8000);
    if (!response.ok) return false;
    const text = await response.text();
    return /QXwap|root|vite/i.test(text);
  } catch {
    return false;
  }
}

async function loadServiceState() {
  try {
    return JSON.parse(await fs.readFile(serviceStatePath, "utf8"));
  } catch {
    return {};
  }
}

async function saveServiceState(state) {
  await fs.writeFile(serviceStatePath, JSON.stringify(state, null, 2));
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function acquireLoopLock() {
  try {
    const raw = await fs.readFile(loopLockPath, "utf8");
    const active = JSON.parse(raw);
    if (active?.pid && active.pid !== process.pid && isPidAlive(active.pid)) {
      return {
        acquired: false,
        active
      };
    }
  } catch {
    // missing or unreadable lock is treated as available
  }

  const nextLock = {
    pid: process.pid,
    mode: once ? "once" : "daemon",
    acquiredAt: new Date().toISOString(),
    stopAtIso
  };
  await fs.writeFile(loopLockPath, JSON.stringify(nextLock, null, 2));
  return {
    acquired: true,
    active: nextLock
  };
}

async function releaseLoopLock() {
  try {
    const raw = await fs.readFile(loopLockPath, "utf8");
    const active = JSON.parse(raw);
    if (active?.pid === process.pid) {
      await fs.rm(loopLockPath, { force: true });
    }
  } catch {
    // ignore
  }
}

function startDetachedProcess({ name, command, args, cwd, outPath, errPath }) {
  return fs.mkdir(path.dirname(outPath), { recursive: true }).then(async () => {
    const outHandle = await fs.open(outPath, "a");
    const errHandle = await fs.open(errPath, "a");
    const child = spawn(command, args, {
      cwd,
      detached: true,
      stdio: ["ignore", outHandle.fd, errHandle.fd]
    });
    child.unref();
    await outHandle.close();
    await errHandle.close();
    return child.pid;
  });
}

async function ensureLocalServices() {
  const state = await loadServiceState();

  if (isLocalUrl(apiBase) && !(await isApiHealthy())) {
    const pid = await startDetachedProcess({
      name: "api",
      command: "pnpm",
      args: ["--filter", "@workspace/api-server", "dev"],
      cwd: repoRoot,
      outPath: path.join(reportDir, "api-dev.out.log"),
      errPath: path.join(reportDir, "api-dev.err.log")
    });
    state.api = { pid, startedAt: new Date().toISOString() };
    await appendLog(`Started local API dev server pid=${pid}`);
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await isApiHealthy()) break;
      await sleep(2000);
    }
  }

  if (isLocalUrl(frontendUrl) && !(await isFrontendHealthy())) {
    const pid = await startDetachedProcess({
      name: "web",
      command: "pnpm",
      args: ["--filter", "@workspace/web-app", "exec", "vite", "--host", "127.0.0.1", "--port", "5174"],
      cwd: repoRoot,
      outPath: path.join(reportDir, "web-dev.out.log"),
      errPath: path.join(reportDir, "web-dev.err.log")
    });
    state.web = { pid, startedAt: new Date().toISOString() };
    await appendLog(`Started local web dev server pid=${pid}`);
    for (let attempt = 0; attempt < 30; attempt++) {
      if (await isFrontendHealthy()) break;
      await sleep(2000);
    }
  }

  await saveServiceState(state);
  return {
    apiHealthy: await isApiHealthy(),
    frontendHealthy: await isFrontendHealthy(),
    serviceState: state
  };
}

async function runCommand(label, command, args, options = {}) {
  const startedAt = Date.now();
  await heartbeat("command-start", {
    state: "running",
    phase: label,
    lastCommand: label
  });
  await appendLog(`Running ${label}: ${command} ${args.join(" ")}`);
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd || repoRoot,
      env: { ...process.env, ...(options.env || {}) }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += String(chunk); });
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    child.on("close", (code) => {
      const result = {
        label,
        ok: code === 0,
        code: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt
      };
      writeStatus({
        state: "running",
        phase: label,
        lastCommand: label,
        lastCommandOk: result.ok,
        lastCommandCode: result.code,
        lastCommandDurationMs: result.durationMs
      }).catch(() => undefined);
      console.log(JSON.stringify({
        ok: result.ok,
        ts: new Date().toISOString(),
        pid: process.pid,
        event: "command-complete",
        label: result.label,
        code: result.code,
        durationMs: result.durationMs
      }));
      resolve(result);
    });
  });
}

async function sleepWithHeartbeat(totalMs, nextRunAtIso) {
  let remainingMs = totalMs;
  while (remainingMs > 0) {
    await heartbeat("sleeping", {
      state: "sleeping",
      phase: "waiting-next-cycle",
      nextRunAt: nextRunAtIso,
      remainingMs
    });
    const chunkMs = Math.min(60_000, remainingMs);
    await sleep(chunkMs);
    remainingMs -= chunkMs;
  }
}

function summarizeCommandFailure(result, title, severity, steps, suggestion, tags) {
  return {
    title,
    hypothesis: `${result.label} fail แปลว่า flow readiness ยังไม่ปลอดภัยพอสำหรับ release หรือ regression`,
    steps,
    expected: `${result.label} ต้องผ่านแบบ exit code 0`,
    actual: `exit=${result.code}\n${(result.stderr || result.stdout).slice(0, 1000)}`,
    severity,
    screenshot: null,
    log: `${result.label}: ${(result.stderr || result.stdout).slice(0, 1000)}`,
    suggestion,
    tags
  };
}

async function ensurePlaywrightBrowsers() {
  try {
    await fs.access(installMarker);
    return { ok: true, installedThisRun: false };
  } catch {
    const install = await runCommand(
      "playwright-install",
      "pnpm",
      ["exec", "playwright", "install", "chromium", "firefox", "webkit"],
      { cwd: repoRoot }
    );
    if (!install.ok) return { ok: false, install };
    await fs.writeFile(installMarker, new Date().toISOString());
    return { ok: true, installedThisRun: true };
  }
}

async function runValidationSuite(browserInstall) {
  const commandResults = [];

  commandResults.push(await runCommand("typecheck", "pnpm", ["typecheck"]));
  commandResults.push(await runCommand("test", "pnpm", ["test"]));
  commandResults.push(await runCommand("build", "pnpm", ["build"]));
  commandResults.push(await runCommand("smoke:api", "pnpm", ["smoke:api"], { env: { API_BASE_URL: apiBase } }));
  commandResults.push(await runCommand("smoke:full", "pnpm", ["smoke:full"], { env: { API_BASE_URL: apiBase } }));

  let browserAudit;
  if (browserInstall.ok) {
    const browserRun = await runCommand(
      "browser-audit",
      "node",
      ["scripts/qxwap-product-readiness-browser.mjs"],
      {
        cwd: repoRoot,
        env: {
          FRONTEND_URL: frontendUrl,
          API_BASE_URL: apiBase,
          PRODUCT_READINESS_REPORT_DIR: reportDir
        }
      }
    );
    commandResults.push(browserRun);
    try {
      browserAudit = JSON.parse(await fs.readFile(path.join(reportDir, "browser-latest.json"), "utf8"));
    } catch {
      browserAudit = { ok: false, findings: [], error: "browser audit did not produce JSON" };
    }
  } else {
    const installResult = browserInstall.install || { stdout: "", stderr: "", code: 1 };
    commandResults.push({
      label: "browser-install",
      ok: false,
      code: installResult.code || 1,
      stdout: installResult.stdout || "",
      stderr: installResult.stderr || "",
      durationMs: 0
    });
    browserAudit = {
      ok: false,
      findings: [
        {
          title: "Playwright browsers are not installed for browser audit",
          hypothesis: "ถ้าไม่มี browser runners loop จะมองไม่เห็น regressions ฝั่งจริงของผู้ใช้",
          steps: ["ติดตั้ง playwright browsers สำหรับ local runner"],
          expected: "browser audit ต้องเปิด route จริงและเก็บ evidence ได้",
          actual: (installResult.stderr || installResult.stdout || "playwright install failed").slice(0, 1000),
          severity: "major",
          screenshot: null,
          log: null,
          suggestion: "แก้ playwright install แล้ว rerun browser audit",
          tags: ["browser-compatibility", "automation"]
        }
      ]
    };
  }

  return { commandResults, browserAudit };
}

async function routeShellChecks() {
  const routes = [
    { name: "home", url: frontendUrl },
    { name: "shop", url: new URL("/?view=shop", frontendUrl).toString() },
    { name: "notifications", url: new URL("/?view=notifications", frontendUrl).toString() },
    { name: "profile_edit", url: new URL("/?view=profile_edit", frontendUrl).toString() },
    { name: "add", url: new URL("/?view=add", frontendUrl).toString() },
    { name: "chat", url: new URL("/?view=chat&offer=smoke", frontendUrl).toString() },
    { name: "offer_detail", url: new URL("/?view=offer_detail&offer=smoke", frontendUrl).toString() }
  ];

  const results = [];
  for (const route of routes) {
    try {
      const response = await fetchWithTimeout(route.url, 10000);
      const text = await response.text();
      results.push({
        ...route,
        ok: response.ok && text.length > 100,
        status: response.status,
        textLength: text.length
      });
    } catch (error) {
      results.push({
        ...route,
        ok: false,
        status: 0,
        textLength: 0,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return results;
}

async function collectAnalyticsReadiness() {
  const sourceDirs = [path.join(repoRoot, "apps/web/src"), path.join(repoRoot, "apps/api/src")];
  const files = [];
  for (const dir of sourceDirs) {
    await walk(dir, files);
  }
  const patterns = [
    "view_page",
    "click_cta",
    "start_signup",
    "complete_signup",
    "submit_form",
    "error_shown",
    "checkout_started",
    "checkout_completed"
  ];
  const eventsFound = new Set();
  for (const file of files) {
    const text = await fs.readFile(file, "utf8");
    for (const pattern of patterns) {
      if (text.includes(pattern)) eventsFound.add(pattern);
    }
  }
  return {
    requiredEvents: patterns,
    eventsFound: Array.from(eventsFound),
    missingEvents: patterns.filter((pattern) => !eventsFound.has(pattern)),
    dropOffPoints: [
      "auth modal submit",
      "guest gate CTA",
      "add item first submit",
      "offer submit",
      "chat first reply",
      "offer accept / approve",
      "profile_edit save"
    ]
  };
}

async function walk(dir, out) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const nextPath = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(nextPath, out);
    else if (entry.isFile()) out.push(nextPath);
  }
}

function buildDynamicIssues({ services, routeChecks, commandResults, browserAudit, analytics }) {
  const issues = [];
  if (!services.apiHealthy) {
    issues.push({
      title: "Local API is not healthy",
      hypothesis: "ถ้า API ไม่ขึ้น readiness loop จะประเมิน flow สำคัญผิดและ user journeys จะใช้งานไม่ได้จริง",
      steps: ["เรียก /api/health บน local API"],
      expected: "health.ok ต้องเป็น true",
      actual: "API health failed",
      severity: "blocker",
      screenshot: null,
      log: null,
      suggestion: "แก้ API startup, DB, หรือ env ให้ /health กลับมาปกติ",
      tags: ["infrastructure", "api", "blocker"]
    });
  }
  if (!services.frontendHealthy) {
    issues.push({
      title: "Local frontend preview is not healthy",
      hypothesis: "ถ้า frontend shell ไม่ขึ้น เราจะพลาด regressions ฝั่ง UI และ user flows ทั้งหมด",
      steps: ["เปิด local frontend URL"],
      expected: "app shell และ route หลักต้อง render ได้",
      actual: "frontend health check failed",
      severity: "blocker",
      screenshot: null,
      log: null,
      suggestion: "แก้ dev server startup หรือ route shell ให้ preview กลับมาปกติ",
      tags: ["infrastructure", "frontend", "blocker"]
    });
  }

  for (const route of routeChecks.filter((entry) => !entry.ok)) {
    issues.push({
      title: `Route shell check failed: ${route.name}`,
      hypothesis: "ผู้ใช้จะ drop-off ถ้า route สำคัญตอบหน้า shell ไม่ครบหรือเปิดไม่ได้",
      steps: [`fetch ${route.url}`],
      expected: "route ควรตอบ HTML shell ที่มีความยาวและ content เพียงพอ",
      actual: route.error || `status=${route.status} textLength=${route.textLength}`,
      severity: route.name === "home" || route.name === "shop" ? "critical" : "major",
      screenshot: null,
      log: route.error || null,
      suggestion: "เช็ก route restore, build output, และ lazy chunks ของ route นี้",
      tags: ["frontend", "shell", route.name]
    });
  }

  for (const result of commandResults) {
    if (result.ok) continue;
    const severity =
      result.label === "typecheck" || result.label === "build"
        ? "blocker"
        : result.label === "smoke:full" || result.label === "browser-audit"
          ? "critical"
          : "major";
    issues.push(
      summarizeCommandFailure(
        result,
        `Command failed: ${result.label}`,
        severity,
        [`รัน ${result.label}`],
        "แก้ command นี้ให้ผ่านก่อนปล่อย readiness score หรือ release decision รอบถัดไป",
        ["automation", result.label]
      )
    );
  }

  for (const finding of browserAudit.findings || []) {
    issues.push(finding);
  }

  if (analytics.missingEvents.length) {
    issues.push({
      title: "Analytics readiness is incomplete for primary conversion events",
      hypothesis: "ทีมจะมองไม่เห็น drop-off จริงหลัง launch ถ้าไม่มี tracking บน flow สำคัญ",
      steps: ["สแกนโค้ดหา event names ที่ required ต่อ launch"],
      expected: "ควรพบ event สำคัญครบอย่างน้อย view_page, click_cta, start_signup, complete_signup, submit_form, error_shown",
      actual: `Missing events: ${analytics.missingEvents.join(", ")}`,
      severity: "major",
      screenshot: null,
      log: null,
      suggestion: "เพิ่ม analytics events ใน flow หลักและผูก drop-off checkpoints กับ funnel จริง",
      tags: ["analytics", "conversion", "launch"]
    });
  }

  return issues;
}

function filterResolvedSeededIssues(seededIssues, browserAudit) {
  const a11yEntries = Array.isArray(browserAudit?.a11y) ? browserAudit.a11y : [];
  const feedStructure = a11yEntries.find((entry) => entry.label === "feed-structure");
  return seededIssues.filter((issue) => {
    if (issue.id === "a11y-nested-button-feed" && feedStructure?.nestedButtonCount === 0) {
      return false;
    }
    return true;
  });
}

function scoreCategory(base, issues, tags) {
  const relevant = issues.filter((issue) => issue.tags?.some((tag) => tags.includes(tag)));
  const penalty = relevant.reduce((sum, issue) => sum + (severityWeights[issue.severity] || 0), 0);
  return Math.max(0, Math.min(100, base - penalty));
}

function computeScores(issues, commandResults, routeChecks, analytics) {
  const scores = {
    uxClarity: scoreCategory(100, issues, ["ux", "conversion", "guest-gate", "onboarding", "offer-detail"]),
    functionalCompleteness: scoreCategory(100, issues, ["functional", "offers", "chat", "shipment", "state-machine", "create-item", "routing"]),
    bugSeverity: Math.max(0, 100 - issues.reduce((sum, issue) => sum + (severityWeights[issue.severity] || 0), 0)),
    accessibility: scoreCategory(100, issues, ["accessibility", "keyboard", "forms", "focus", "labels", "html-semantics"]),
    performance: scoreCategory(100, issues, ["performance", "loading", "network"]),
    mobileReadiness: scoreCategory(100, issues, ["mobile", "layout", "responsive"]),
    errorHandling: scoreCategory(100, issues, ["error-handling", "error-recovery", "server-error", "unauthorized", "deep-link", "session"]),
    conversionReadiness: scoreCategory(100, issues, ["conversion", "analytics", "auth", "create-item", "offers", "guest-gate"])
  };

  if (commandResults.some((result) => !result.ok)) {
    scores.functionalCompleteness = Math.max(0, scores.functionalCompleteness - 15);
    scores.performance = Math.max(0, scores.performance - 10);
  }
  if (routeChecks.some((route) => !route.ok)) {
    scores.mobileReadiness = Math.max(0, scores.mobileReadiness - 10);
    scores.uxClarity = Math.max(0, scores.uxClarity - 10);
  }
  if (analytics.missingEvents.length) {
    scores.conversionReadiness = Math.max(0, scores.conversionReadiness - analytics.missingEvents.length * 6);
  }

  const overall = Math.round(
    Object.values(scores).reduce((sum, value) => sum + value, 0) / Object.keys(scores).length
  );
  return { ...scores, overall };
}

function buildFlowMatrix(commandResults, browserAudit) {
  const commandByLabel = Object.fromEntries(commandResults.map((result) => [result.label, result]));
  return [
    { flow: "signup", status: commandByLabel["smoke:full"]?.ok ? "pass" : "risk", evidence: "smoke:full creates two users" },
    { flow: "login", status: commandByLabel["smoke:full"]?.ok ? "pass" : "risk", evidence: "smoke:full sign-in and cookie setup" },
    { flow: "onboarding", status: "risk", evidence: "seeded bug ftu-no-post-auth-onboarding" },
    { flow: "create item", status: commandByLabel["smoke:full"]?.ok ? "pass" : "risk", evidence: "smoke:full creates owner item" },
    { flow: "edit item", status: commandByLabel["smoke:full"]?.ok ? "pass" : "risk", evidence: "smoke:full PATCH /items/:id" },
    { flow: "delete item", status: commandByLabel["smoke:full"]?.ok ? "pass" : "risk", evidence: "smoke:full DELETE /items/:id" },
    { flow: "payment / checkout", status: "n/a", evidence: "canonical repo currently has no checkout flow" },
    { flow: "search", status: commandByLabel["smoke:full"]?.ok ? "pass" : "risk", evidence: "smoke:full search assertions" },
    { flow: "filter", status: browserAudit.ok ? "pass" : "risk", evidence: "browser sweep + route shell checks" },
    { flow: "settings / profile_edit", status: browserAudit.ok ? "pass" : "risk", evidence: "browser authenticated profile_edit" },
    { flow: "logout", status: "risk", evidence: "needs more direct browser assertion in a later sprint" },
    { flow: "error recovery", status: browserAudit.ok ? "partial" : "risk", evidence: "offline + forced 500 checks in browser audit" }
  ];
}

function buildMarkdownReport(run) {
  const lines = [];
  lines.push(`# QXwap Product Readiness Report`);
  lines.push("");
  lines.push(`- Generated: ${run.generatedAt}`);
  lines.push(`- Frontend: ${run.frontendUrl}`);
  lines.push(`- API: ${run.apiBase}`);
  lines.push(`- Overall score: **${run.scores.overall}/100**`);
  lines.push(`- Ready for release: **${run.ready ? "yes" : "no"}**`);
  lines.push("");
  lines.push("## Product Readiness Scores");
  lines.push("");
  lines.push(`- UX clarity: ${run.scores.uxClarity}`);
  lines.push(`- Functional completeness: ${run.scores.functionalCompleteness}`);
  lines.push(`- Bug severity: ${run.scores.bugSeverity}`);
  lines.push(`- Accessibility: ${run.scores.accessibility}`);
  lines.push(`- Performance: ${run.scores.performance}`);
  lines.push(`- Mobile readiness: ${run.scores.mobileReadiness}`);
  lines.push(`- Error handling: ${run.scores.errorHandling}`);
  lines.push(`- Conversion readiness: ${run.scores.conversionReadiness}`);
  lines.push("");
  lines.push("## Primary Flows");
  lines.push("");
  for (const flow of run.flows) {
    lines.push(`- ${flow.flow}: ${flow.status} (${flow.evidence})`);
  }
  lines.push("");
  lines.push("## Personas");
  lines.push("");
  for (const persona of personas) {
    lines.push(`- ${persona.role}: ${persona.summary}`);
  }
  lines.push("");
  lines.push("## Bugs");
  lines.push("");
  for (const issue of run.issues.slice(0, 25)) {
    lines.push(`### [${issue.severity.toUpperCase()}] ${issue.title}`);
    lines.push(`- Persona / tags: ${(issue.personaId || "dynamic")} / ${(issue.tags || []).join(", ")}`);
    lines.push(`- Hypothesis: ${issue.hypothesis}`);
    lines.push(`- Steps:`);
    for (const step of issue.steps || []) lines.push(`  - ${step}`);
    lines.push(`- Expected: ${issue.expected}`);
    lines.push(`- Actual: ${issue.actual}`);
    lines.push(`- Suggestion: ${issue.suggestion}`);
    if (issue.screenshot) lines.push(`- Screenshot: ${issue.screenshot}`);
    if (issue.log) lines.push(`- Log: ${String(issue.log).slice(0, 400)}`);
    lines.push("");
  }
  lines.push("## Auto-Fix Queue");
  lines.push("");
  lines.push(`- Applied: ${run.autoFix?.applied?.length || 0}`);
  lines.push(`- Skipped: ${run.autoFix?.skipped?.length || 0}`);
  lines.push(`- Regression rerun: ${run.autoFix?.regressionRan ? "yes" : "no"}`);
  for (const task of run.autoFix?.applied || []) {
    lines.push(`- Applied ${task.id}: ${task.summary}`);
  }
  for (const task of run.autoFix?.skipped || []) {
    lines.push(`- Skipped ${task.id}: ${task.reason}`);
  }
  lines.push("");
  lines.push("## Analytics Readiness");
  lines.push("");
  lines.push(`- Found events: ${run.analytics.eventsFound.join(", ") || "none"}`);
  lines.push(`- Missing events: ${run.analytics.missingEvents.join(", ") || "none"}`);
  lines.push(`- Drop-off checkpoints: ${run.analytics.dropOffPoints.join(", ")}`);
  lines.push("");
  lines.push("## Launch Recommendation");
  lines.push("");
  if (run.ready) {
    lines.push("- No blocker/critical issues remain and readiness score is above 90.");
    lines.push("- Continue monitor-only loops until deployment window closes.");
  } else {
    lines.push("- Do not launch yet.");
    lines.push("- Fix blocker/critical issues first, then rerun regression and browser audit.");
  }
  return `${lines.join("\n")}\n`;
}

function buildRunPayload({
  generatedAt,
  services,
  routeChecks,
  commandResults,
  browserAudit,
  analytics,
  autoFix
}) {
  const dynamicIssues = buildDynamicIssues({ services, routeChecks, commandResults, browserAudit, analytics });
  const activeSeededIssues = filterResolvedSeededIssues(seededBugReports, browserAudit);
  const allIssues = [...activeSeededIssues, ...dynamicIssues];
  const severitySummary = countSeverity(allIssues);
  const scores = computeScores(allIssues, commandResults, routeChecks, analytics);
  const flows = buildFlowMatrix(commandResults, browserAudit);
  const ready = severitySummary.blocker === 0 && severitySummary.critical === 0 && scores.overall > 90;

  return {
    generatedAt,
    frontendUrl,
    apiBase,
    stopAtIso,
    services,
    commandResults,
    routeChecks,
    analytics,
    browserAudit,
    autoFix,
    issues: allIssues,
    severitySummary,
    scores,
    flows,
    ready
  };
}

async function runOneRound() {
  const generatedAt = new Date().toISOString();
  await heartbeat("round-start", {
    state: "running",
    phase: "round-start",
    lastRoundStartedAt: generatedAt,
    nextRunAt: null
  });
  await ensureDirs();
  const services = await ensureLocalServices();

  const browserInstall = await ensurePlaywrightBrowsers();
  let { commandResults, browserAudit } = await runValidationSuite(browserInstall);
  let routeChecks = await routeShellChecks();
  const analytics = await collectAnalyticsReadiness();
  let autoFix = {
    queue: [],
    applied: [],
    skipped: [],
    regressionRan: false
  };
  let runPayload = buildRunPayload({
    generatedAt,
    services,
    routeChecks,
    commandResults,
    browserAudit,
    analytics,
    autoFix
  });

  autoFix = await applyAutoFixQueue(runPayload.issues);
  if (autoFix.applied.length) {
    autoFix.regressionRan = true;
    await appendLog(`Applied auto-fix queue: ${autoFix.applied.map((task) => task.id).join(", ")}`);
    ({ commandResults, browserAudit } = await runValidationSuite(browserInstall));
    routeChecks = await routeShellChecks();
    runPayload = buildRunPayload({
      generatedAt,
      services,
      routeChecks,
      commandResults,
      browserAudit,
      analytics,
      autoFix
    });
  } else {
    runPayload = {
      ...runPayload,
      autoFix
    };
  }

  const runBaseName = generatedAt.replace(/[:.]/g, "-");
  const jsonPath = path.join(historyDir, `${runBaseName}.json`);
  const mdPath = path.join(historyDir, `${runBaseName}.md`);
  const markdown = buildMarkdownReport(runPayload);

  await fs.writeFile(jsonPath, JSON.stringify(runPayload, null, 2));
  await fs.writeFile(mdPath, markdown);
  await fs.writeFile(latestJson, JSON.stringify(runPayload, null, 2));
  await fs.writeFile(latestMarkdown, markdown);
  await appendLog(`Completed product-readiness round score=${runPayload.scores.overall} ready=${runPayload.ready}`);
  await heartbeat("round-complete", {
    state: "running",
    phase: "round-complete",
    lastRoundCompletedAt: new Date().toISOString(),
    lastScore: runPayload.scores.overall,
    ready: runPayload.ready,
    severitySummary: runPayload.severitySummary
  });
  notifyDesktop(
    "QXwap readiness",
    `รอบล่าสุด score ${runPayload.scores.overall}/100 • blocker ${runPayload.severitySummary.blocker} • critical ${runPayload.severitySummary.critical}`
  );
  return runPayload;
}

async function main() {
  await ensureDirs();
  const lock = await acquireLoopLock();
  if (!lock.acquired) {
    await appendLog(`Skipped product-readiness start; pid=${lock.active?.pid} already owns the loop lock`).catch(() => undefined);
    console.log(JSON.stringify({ ok: true, skipped: true, reason: "loop-lock-active", active: lock.active }, null, 2));
    return;
  }

  await writeStatus({
    state: "booting",
    phase: "boot",
    pid: process.pid,
    mode: once ? "once" : "daemon",
    intervalMs,
    stopAtIso,
    nextRunAt: new Date().toISOString()
  }, { merge: false });
  await appendLog(`Booted product-readiness loop mode=${once ? "once" : "daemon"} stopAt=${stopAtIso} intervalMs=${intervalMs}`);
  await heartbeat("boot", {
    state: "booting",
    phase: "boot",
    mode: once ? "once" : "daemon",
    stopAtIso,
    intervalMs
  });
  notifyDesktop("QXwap readiness", `เริ่ม loop อัตโนมัติแล้ว • รอบถัดไปทุก 30 นาที • cutoff ${stopAtIso}`);
  if (once) {
    try {
      const run = await runOneRound();
      await writeStatus({
        state: "stopped",
        phase: "completed",
        lastRoundCompletedAt: new Date().toISOString(),
        nextRunAt: null,
        lastScore: run.scores.overall,
        ready: run.ready
      });
      console.log(JSON.stringify({ ok: true, report: latestJson, score: run.scores.overall, ready: run.ready }, null, 2));
      return;
    } finally {
      await releaseLoopLock();
    }
  }

  try {
    const stopAt = new Date(stopAtIso).getTime();
    while (Date.now() < stopAt) {
      const run = await runOneRound();
      const remaining = stopAt - Date.now();
      if (remaining <= 0) break;
      const sleepMs = Math.min(intervalMs, remaining);
      const nextRunAtIso = new Date(Date.now() + sleepMs).toISOString();
      await writeStatus({
        state: "sleeping",
        phase: "waiting-next-cycle",
        lastRoundCompletedAt: new Date().toISOString(),
        nextRunAt: nextRunAtIso,
        lastScore: run.scores.overall,
        ready: run.ready
      });
      await sleepWithHeartbeat(sleepMs, nextRunAtIso);
    }
    await appendLog(`Reached stopAt=${stopAtIso}; product-readiness loop is exiting cleanly`);
    await writeStatus({
      state: "stopped",
      phase: "deadline-reached",
      nextRunAt: null,
      stoppedAt: new Date().toISOString()
    });
    await heartbeat("stopped", {
      state: "stopped",
      phase: "deadline-reached",
      stopAtIso
    });
    notifyDesktop("QXwap readiness", "ถึง cutoff ของ loop แล้วและหยุดอัตโนมัติเรียบร้อย");
  } finally {
    await releaseLoopLock();
  }
}

main().catch(async (error) => {
  await ensureDirs().catch(() => undefined);
  await releaseLoopLock().catch(() => undefined);
  await appendLog(`Loop failed: ${error instanceof Error ? error.stack || error.message : String(error)}`).catch(() => undefined);
  await writeStatus({
    state: "failed",
    phase: "error",
    nextRunAt: null,
    lastError: error instanceof Error ? error.stack || error.message : String(error)
  }).catch(() => undefined);
  notifyDesktop("QXwap readiness", "loop พังระหว่างรัน ตรวจ log ล่าสุดได้ที่ /tmp/qxwap-product-readiness");
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
