#!/usr/bin/env node

import { randomBytes } from "node:crypto";

const bytes = Number(process.argv[2] || 48);

if (!Number.isInteger(bytes) || bytes < 32) {
  console.error("Usage: pnpm secret:session [bytes]");
  console.error("Use at least 32 bytes. Recommended: 48 or 64.");
  process.exit(1);
}

console.log(randomBytes(bytes).toString("base64url"));
