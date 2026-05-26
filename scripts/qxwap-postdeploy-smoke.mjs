#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const rawApiBase = process.env.API_BASE_URL || process.env.API_BASE || "";
const rawFrontendUrl =
  process.env.FRONTEND_URL ||
  (process.env.FRONTEND_ORIGIN ? `${process.env.FRONTEND_ORIGIN}${process.env.BASE_PATH || "/QXwap/"}` : "");

const apiBase = normalizeApiBase(rawApiBase);
const frontendUrl = normalizeFrontendUrl(rawFrontendUrl);

if (!apiBase || !frontendUrl) {
  console.error("[QXwap release smoke] missing required env");
  console.error("Usage:");
  console.error("  API_BASE_URL=https://<backend>/api FRONTEND_URL=https://<frontend>/QXwap/ pnpm smoke:release");
  console.error("Or:");
  console.error("  API_BASE_URL=https://<backend>/api FRONTEND_ORIGIN=https://<origin> BASE_PATH=/QXwap/ pnpm smoke:release");
  process.exit(1);
}

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
  if (!raw) return "";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

function check(name, condition, detail = "") {
  const icon = condition ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  const suffix = detail ? `  ${condition ? "\x1b[2m" : "\x1b[33m"}${detail}\x1b[0m` : "";
  console.log(`${icon} ${name}${suffix}`);
  return condition;
}

function section(title) {
  console.log(`\n\x1b[1;36m${title}\x1b[0m`);
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

function runNodeScript(scriptName, env = {}) {
  console.log(`\n[QXwap release smoke] $ node scripts/${scriptName}`);
  const result = spawnSync(process.execPath, [`scripts/${scriptName}`], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: false
  });
  return result.status || 0;
}

async function checkFrontendRoute(name, relativePath) {
  const url = new URL(relativePath, frontendUrl).toString();
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

  return check(`frontend route: ${name}`, ok, `${url} → ${result.status || "ERR"}`);
}

async function main() {
  console.log("\x1b[1mQXwap post-deploy release smoke\x1b[0m");
  console.log(`API:      ${apiBase}`);
  console.log(`Frontend: ${frontendUrl}`);

  section("1. API smoke");
  let failed = false;

  const health = await fetchText(`${apiBase}/health`);
  const healthJson = (() => {
    try {
      return JSON.parse(health.text);
    } catch {
      return null;
    }
  })();

  failed ||= !check(
    "health endpoint",
    health.ok && healthJson?.ok === true && healthJson?.database === "connected",
    `${apiBase}/health → ${health.status || "ERR"}`
  );

  const version = await fetchText(`${apiBase}/version`);
  const versionJson = (() => {
    try {
      return JSON.parse(version.text);
    } catch {
      return null;
    }
  })();

  failed ||= !check(
    "version endpoint",
    version.ok && typeof versionJson?.commit === "string" && versionJson.commit.length > 0,
    `${apiBase}/version → ${version.status || "ERR"}`
  );

  if (runNodeScript("qxwap-api-smoke.mjs", { API_BASE_URL: apiBase }) !== 0) failed = true;
  if (
    runNodeScript("qxwap-full-smoke.mjs", {
      API_BASE_URL: apiBase,
      API_BASE: apiBase,
      FRONTEND_ORIGIN: frontendUrl,
      BASE_PATH: "/"
    }) !== 0
  ) {
    failed = true;
  }

  section("2. Frontend route shell checks");
  for (const route of routeChecks) {
    failed ||= !(await checkFrontendRoute(route.name, route.path));
  }

  if (failed) {
    console.error("\n[QXwap release smoke] failed");
    process.exit(1);
  }

  console.log("\n[QXwap release smoke] passed");
}

main().catch((error) => {
  console.error("\n[QXwap release smoke] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
