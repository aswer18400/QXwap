#!/usr/bin/env node

const apiBase = (process.env.API_BASE_URL || process.argv[2] || "http://localhost:8787/api").replace(/\/+$/, "");

async function check(path) {
  const response = await fetch(apiBase + path);
  if (!response.ok) {
    throw new Error(path + " returned " + response.status);
  }
  console.log("ok", path, response.status);
}

await check("/health");
await check("/version");
await check("/auth/me");
console.log("checks complete");
