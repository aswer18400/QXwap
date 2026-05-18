#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve("apps/web/dist");
const distIndex = path.resolve(distDir, "index.html");
const distStatus = path.resolve(distDir, "status.html");
const rawApiBase = process.env.API_BASE || process.env.API_BASE_URL || "";

function normalizeApiBase(rawValue) {
  const raw = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

if (!rawApiBase) {
  console.error("[QXwap inject API base] API_BASE or API_BASE_URL is required");
  process.exit(1);
}

if (!fs.existsSync(distIndex)) {
  console.error("[QXwap inject API base] apps/web/dist/index.html does not exist. Run the web build first.");
  process.exit(1);
}

const apiBase = normalizeApiBase(rawApiBase);
const replacement = `window.API_BASE = ${JSON.stringify(apiBase)};`;
const placeholder = 'window.API_BASE = window.API_BASE || "";';
const results = [];

function injectInto(filePath, { required }) {
  if (!fs.existsSync(filePath)) {
    if (required) {
      console.error(`[QXwap inject API base] ${filePath} does not exist. Run the web build first.`);
      process.exit(1);
    }
    return { file: path.basename(filePath), injected: false, reason: "absent" };
  }
  const html = fs.readFileSync(filePath, "utf8");
  if (html.includes(placeholder)) {
    fs.writeFileSync(filePath, html.replace(placeholder, replacement));
    return { file: path.basename(filePath), injected: true, mode: "placeholder" };
  }
  if (/window\.API_BASE\s*=\s*[^;]+;/.test(html)) {
    fs.writeFileSync(filePath, html.replace(/window\.API_BASE\s*=\s*[^;]+;/, replacement));
    return { file: path.basename(filePath), injected: true, mode: "regex" };
  }
  // status.html does not rely on window.API_BASE at build time — it falls
  // back to the ?api= query string and a localhost default. Skip silently
  // when there is nothing to replace.
  return { file: path.basename(filePath), injected: false, reason: "no-placeholder" };
}

results.push(injectInto(distIndex, { required: true }));
results.push(injectInto(distStatus, { required: false }));

if (!results[0].injected) {
  console.error("[QXwap inject API base] window.API_BASE placeholder was not found in apps/web/dist/index.html");
  process.exit(1);
}

console.log("[QXwap inject API base] passed", JSON.stringify({ apiBase, files: results }, null, 2));
