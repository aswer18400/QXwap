#!/usr/bin/env node

import os from "node:os";

const webPort = process.env.WEB_PORT || process.env.PORT || "5173";
const apiPort = process.env.API_PORT || "8787";

function getLanAddresses() {
  const interfaces = os.networkInterfaces();
  const results = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        results.push({ name, address: entry.address });
      }
    }
  }
  return results;
}

const addresses = getLanAddresses();

if (!addresses.length) {
  console.error("No LAN IPv4 address found. Connect to Wi-Fi or use ifconfig/ipconfig manually.");
  process.exit(1);
}

console.log("QXwap LAN QA URLs");
console.log("");
for (const { name, address } of addresses) {
  console.log(`Interface: ${name}`);
  console.log(`  Web:    http://${address}:${webPort}`);
  console.log(`  API:    http://${address}:${apiPort}/api/health`);
  console.log("");
}

console.log("Start commands:");
console.log("  PGLITE_DATA_DIR=.data/qxwap-pglite-uiqa pnpm --filter @workspace/api-server dev");
console.log("  PORT=5173 pnpm --filter @workspace/web-app dev -- --host 0.0.0.0");
