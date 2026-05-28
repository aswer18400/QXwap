#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const argv = new Set(process.argv.slice(2));
const once = argv.has("--once");
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

const prNumber = String(process.env.PR_NUMBER || "221");
const localApiBase = normalizeApiBase(process.env.API_BASE_URL || process.env.API_BASE || "http://127.0.0.1:8787/api");
const localFrontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL || "http://127.0.0.1:5174/");
const prodApiBase = normalizeApiBase(process.env.PROD_API_BASE_URL || "https://qxwap-api.onrender.com/api");
const prodFrontendUrl = normalizeFrontendUrl(process.env.PROD_FRONTEND_URL || "https://aswer18400.github.io/QXwap/");
const loopMs = Number(process.env.UX_WATCH_INTERVAL_MS || 60 * 60 * 1000);
const stateFile = process.env.UX_WATCH_STATE_FILE || "/tmp/qxwap-hourly-ux-watch.state.json";
const logFile = process.env.UX_WATCH_LOG_FILE || "/tmp/qxwap-hourly-ux-watch.log";
const latestJson = process.env.UX_WATCH_LATEST_FILE || "/tmp/qxwap-hourly-ux-watch-latest.json";
const shouldTriggerDeploy = String(process.env.UX_WATCH_TRIGGER_DEPLOY || "true") === "true";
const localApiPidFile = process.env.UX_WATCH_LOCAL_API_PID || "/tmp/qxwap-local-api.pid";
const localWebPidFile = process.env.UX_WATCH_LOCAL_WEB_PID || "/tmp/qxwap-local-web.pid";
const localApiLog = process.env.UX_WATCH_LOCAL_API_LOG || "/tmp/qxwap-local-api.log";
const localWebLog = process.env.UX_WATCH_LOCAL_WEB_LOG || "/tmp/qxwap-local-web.log";

const routeChecks = [
  { name: "home", path: "" },
  { name: "shop", path: "?view=shop" },
  { name: "notifications", path: "?view=notifications" },
  { name: "profile_edit", path: "?view=profile_edit" },
  { name: "add", path: "?view=add" },
  { name: "chat", path: "?view=chat" },
  { name: "offer_detail", path: "?view=offer_detail" }
];

function normalizeApiBase(rawValue) {
  const raw = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

function normalizeFrontendUrl(rawValue) {
  const raw = String(rawValue || "").trim();
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function nowIso() {
  return new Date().toISOString();
}

function appendLog(text) {
  mkdirSync(dirname(logFile), { recursive: true });
  const line = `[${nowIso()}] ${text}\n`;
  process.stdout.write(line);
  writeFileSync(logFile, line, { flag: "a" });
}

function readState() {
  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    return {};
  }
}

function writeState(nextState) {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(nextState, null, 2));
}

function readPid(file) {
  try {
    const raw = readFileSync(file, "utf8").trim();
    const pid = Number(raw);
    return Number.isFinite(pid) && pid > 0 ? pid : 0;
  } catch {
    return 0;
  }
}

function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function isReachable(url) {
  const result = await fetchText(url, 3000);
  return result.ok || result.status > 0;
}

function spawnDetached(command, args, logPath) {
  mkdirSync(dirname(logPath), { recursive: true });
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env },
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    shell: false
  });
  child.unref();
  writeFileSync(logPath, `[${nowIso()}] spawned ${command} ${args.join(" ")}\n`, { flag: "a" });
  return child.pid || 0;
}

async function ensureLocalApi() {
  if (await isReachable(`${localApiBase}/health`)) return;
  const existingPid = readPid(localApiPidFile);
  if (isPidAlive(existingPid)) return;
  appendLog("Local API unreachable; starting apps/api dev server");
  const pid = spawnDetached("pnpm", ["--filter", "@workspace/api-server", "dev"], localApiLog);
  if (pid) writeFileSync(localApiPidFile, `${pid}\n`);
  for (let attempt = 0; attempt < 15; attempt++) {
    if (await isReachable(`${localApiBase}/health`)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function ensureLocalWeb() {
  if (await isReachable(localFrontendUrl)) return;
  const existingPid = readPid(localWebPidFile);
  if (isPidAlive(existingPid)) return;
  appendLog("Local frontend unreachable; starting apps/web dev server");
  const pid = spawnDetached("pnpm", ["--dir", "apps/web", "exec", "vite", "--host", "127.0.0.1", "--port", "5174"], localWebLog);
  if (pid) writeFileSync(localWebPidFile, `${pid}\n`);
  for (let attempt = 0; attempt < 15; attempt++) {
    if (await isReachable(localFrontendUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function nextNoonBangkok() {
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
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const dateString = `${parts.year}-${parts.month}-${parts.day}T12:00:00+07:00`;
  const candidate = new Date(dateString).getTime();
  if (Date.now() < candidate) return candidate;
  const next = new Date(candidate + 24 * 60 * 60 * 1000);
  return next.getTime();
}

function resolveStopAtEpoch() {
  const raw = process.env.UX_WATCH_STOP_AT || "";
  if (raw) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return nextNoonBangkok();
}

function runCommand(label, command, args, env = {}) {
  appendLog(`$ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    encoding: "utf8",
    shell: false
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (stdout) writeFileSync(logFile, stdout, { flag: "a" });
  if (stderr) writeFileSync(logFile, stderr, { flag: "a" });
  return { ok: result.status === 0, status: result.status || 0, stdout, stderr };
}

function readJsonCommand(command, args) {
  const result = runCommand("json", command, args);
  if (!result.ok) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "cache-control": "no-cache" }
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, headers: response.headers, text };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error), text: "" };
  } finally {
    clearTimeout(timeout);
  }
}

async function frontendShellLane() {
  const checks = [];
  for (const route of routeChecks) {
    const url = new URL(route.path, localFrontendUrl).toString();
    const result = await fetchText(url);
    const contentType = result.headers?.get("content-type") || "";
    const shellLooksValid =
      result.text.includes('<div id="root"></div>') ||
      result.text.includes('<div id="root">') ||
      result.text.includes("QXwap");
    const ok =
      result.ok &&
      contentType.includes("text/html") &&
      shellLooksValid &&
      !result.text.includes("There isn't a GitHub Pages site here.") &&
      !result.text.includes("<title>404") &&
      !result.text.includes("404");
    checks.push({ route: route.name, ok, status: result.status || 0, url });
  }
  return {
    name: "UX Agent 2 - Frontend Shell",
    ok: checks.every((check) => check.ok),
    checks
  };
}

function releaseLane() {
  const pr = readJsonCommand("gh", [
    "pr",
    "view",
    prNumber,
    "--json",
    "number,title,url,state,isDraft,mergeStateStatus,reviewDecision,mergedAt,statusCheckRollup"
  ]);
  const readiness = runCommand("release", "pnpm", ["check:release-pr", "--", "--pr", prNumber]);
  return {
    name: "UX Agent 1 - Release Gate",
    ok: readiness.ok,
    pr,
    blocked: !readiness.ok,
    merged: Boolean(pr?.mergedAt),
    isDraft: Boolean(pr?.isDraft),
    details: readiness.stdout.trim()
  };
}

function apiLane() {
  const result = runCommand("api", "pnpm", ["smoke:api"], { API_BASE_URL: localApiBase });
  return {
    name: "UX Agent 3 - API Contract",
    ok: result.ok,
    status: result.status
  };
}

function journeyLane() {
  const result = runCommand("journey", "pnpm", ["smoke:full"], {
    API_BASE_URL: localApiBase,
    API_BASE: localApiBase,
    FRONTEND_ORIGIN: new URL(localFrontendUrl).origin,
    BASE_PATH: "/"
  });
  return {
    name: "UX Agent 4 - Journey Flow",
    ok: result.ok,
    status: result.status
  };
}

function buildAndProdLane(releaseInfo, state) {
  const typecheck = runCommand("typecheck", "pnpm", ["typecheck"]);
  const test = runCommand("test", "pnpm", ["test"]);
  const build = runCommand("build", "pnpm", ["build"]);
  let deployTriggered = state.deployTriggered || false;
  let releaseSmoke = null;

  if (releaseInfo?.merged && shouldTriggerDeploy && !deployTriggered) {
    const deploy = runCommand("deploy", "gh", [
      "workflow",
      "run",
      "deploy-render.yml",
      "--ref",
      "main",
      "-f",
      "reason=hourly ux watch after PR #221 merge"
    ]);
    deployTriggered = deploy.ok;
  }

  if (releaseInfo?.merged) {
    releaseSmoke = runCommand("release-smoke", "pnpm", ["smoke:release"], {
      API_BASE_URL: prodApiBase,
      FRONTEND_URL: prodFrontendUrl
    });
  }

  const localBuildOk = typecheck.ok && build.ok && test.ok;
  const laneOk = releaseSmoke ? localBuildOk && releaseSmoke.ok : localBuildOk;

  return {
    name: "UX Agent 5 - Build & Production",
    ok: laneOk,
    deployTriggered,
    releaseSmoke: releaseSmoke ? { ok: releaseSmoke.ok, status: releaseSmoke.status } : null,
    typecheck: { ok: typecheck.ok, status: typecheck.status },
    test: { ok: test.ok, status: test.status },
    build: { ok: build.ok, status: build.status }
  };
}

async function runCycle() {
  const state = readState();
  const startedAt = nowIso();
  appendLog("Starting hourly UX watch cycle");
  await ensureLocalApi();
  await ensureLocalWeb();

  const releaseInfo = releaseLane();
  const frontendInfo = await frontendShellLane();
  const apiInfo = apiLane();
  const journeyInfo = journeyLane();
  const buildInfo = buildAndProdLane(releaseInfo, state);

  const summary = {
    startedAt,
    finishedAt: nowIso(),
    localApiBase,
    localFrontendUrl,
    prodApiBase,
    prodFrontendUrl,
    prNumber,
    lanes: [releaseInfo, frontendInfo, apiInfo, journeyInfo, buildInfo]
  };

  writeFileSync(latestJson, JSON.stringify(summary, null, 2));
  writeState({
    lastRunAt: summary.finishedAt,
    deployTriggered: Boolean(buildInfo.deployTriggered),
    lastReleaseSmokeOk: Boolean(buildInfo.releaseSmoke?.ok)
  });

  const failed = summary.lanes.filter((lane) => !lane.ok).map((lane) => lane.name);
  if (failed.length) appendLog(`Cycle finished with failures: ${failed.join(", ")}`);
  else appendLog("Cycle finished clean");
}

async function main() {
  const stopAtEpoch = resolveStopAtEpoch();
  appendLog(`Hourly UX watch armed until ${new Date(stopAtEpoch).toISOString()}`);

  do {
    await runCycle();
    if (once) break;
    if (Date.now() + loopMs > stopAtEpoch) break;
    appendLog(`Sleeping ${Math.round(loopMs / 60000)} minutes before next cycle`);
    await new Promise((resolve) => setTimeout(resolve, loopMs));
  } while (Date.now() < stopAtEpoch);

  appendLog("Hourly UX watch stopped");
}

main().catch((error) => {
  appendLog(`Hourly UX watch failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
