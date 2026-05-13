#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const distIndex = path.resolve("apps/web/dist/index.html");
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
const html = fs.readFileSync(distIndex, "utf8");
const placeholder = 'window.API_BASE = window.API_BASE || "";';
const replacement = `window.API_BASE = ${JSON.stringify(apiBase)};`;

if (!html.includes(placeholder) && !html.includes("window.API_BASE = ")) {
  console.error("[QXwap inject API base] window.API_BASE placeholder was not found in apps/web/dist/index.html");
  process.exit(1);
}

const nextHtml = html.includes(placeholder)
  ? html.replace(placeholder, replacement)
  : html.replace(/window\.API_BASE\s*=\s*[^;]+;/, replacement);

fs.writeFileSync(distIndex, nextHtml);

console.log("[QXwap inject API base] passed", JSON.stringify({ apiBase }, null, 2));
