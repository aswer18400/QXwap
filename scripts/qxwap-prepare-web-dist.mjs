#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const basePath = process.env.BASE_PATH || "/QXwap/";
const apiBase = process.env.API_BASE || process.env.API_BASE_URL || "";

function run(command, args, env = {}) {
  console.log(`\n[QXwap prepare web dist] $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    stdio: "inherit",
    shell: false
  });

  if (result.status !== 0) process.exit(result.status || 1);
}

run("pnpm", ["--filter", "@workspace/web-app", "build"], { BASE_PATH: basePath });

if (apiBase) {
  run("pnpm", ["inject:web-api-base"], { API_BASE: apiBase, BASE_PATH: basePath });
}

run("pnpm", ["check:web-dist"], { API_BASE: apiBase, BASE_PATH: basePath });

console.log(
  "\n[QXwap prepare web dist] passed",
  JSON.stringify(
    {
      basePath,
      apiBase: apiBase || "(not injected)"
    },
    null,
    2
  )
);
