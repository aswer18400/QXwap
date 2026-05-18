#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const distIndex = path.resolve("apps/web/dist/index.html");
const expectedBase = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
const expectedApiBase = process.env.API_BASE || process.env.API_BASE_URL || "";
const errors = [];

function fail(message) {
  errors.push(message);
}

if (!fs.existsSync(distIndex)) {
  fail("apps/web/dist/index.html does not exist. Run the web build first.");
} else {
  const html = fs.readFileSync(distIndex, "utf8");
  const assetPaths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
  const localAssetPaths = assetPaths.filter((assetPath) => assetPath.startsWith("/") && !assetPath.startsWith("//"));

  for (const assetPath of localAssetPaths) {
    if (!assetPath.startsWith(expectedBase)) {
      fail(`built asset path ${assetPath} does not start with BASE_PATH ${expectedBase}`);
    }
  }

  if (expectedApiBase && !html.includes(`window.API_BASE = ${JSON.stringify(expectedApiBase)}`)) {
    fail("built index.html does not contain the expected injected window.API_BASE");
  }
}

if (errors.length) {
  console.error("[QXwap web dist check] failed");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("[QXwap web dist check] passed", JSON.stringify({ basePath: expectedBase, apiInjected: Boolean(expectedApiBase) }, null, 2));
