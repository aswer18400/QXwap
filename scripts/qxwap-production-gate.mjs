#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const backendDomain = process.env.API_BASE_URL || process.env.API_BASE || "https://qxwap-api.example.com/api";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://aswer18400.github.io";
const basePath = process.env.BASE_PATH || "/QXwap/";
const sessionSecret =
  process.env.SESSION_SECRET || "local-production-gate-secret-that-is-long-enough-for-preflight";
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://user:pass@example.com:5432/qxwap?sslmode=require";

const commands = [
  ["pnpm", ["run", "typecheck"]],
  ["pnpm", ["--filter", "@workspace/api-server", "test"]],
  ["pnpm", ["--filter", "@workspace/api-server", "build"]],
  ["pnpm", ["--filter", "@workspace/web-app", "build"], { env: { PORT: "4173", BASE_PATH: basePath } }],
  [
    "pnpm",
    ["preflight:backend"],
    {
      env: {
        DATABASE_URL: databaseUrl,
        SESSION_SECRET: sessionSecret,
        FRONTEND_ORIGIN: frontendOrigin,
        NODE_ENV: "production"
      }
    }
  ],
  ["pnpm", ["inject:web-api-base"], { env: { API_BASE: backendDomain } }],
  ["pnpm", ["check:web-dist"], { env: { BASE_PATH: basePath, API_BASE: backendDomain } }],
  [
    "rg",
    ["-n", "^(<<<<<<<|=======|>>>>>>>)", "AI_START_HERE.md", "README.md", "docs", "scripts", ".github", "package.json", "render.yaml"]
  ]
];

function run(command, args, options = {}) {
  const env = { ...process.env, ...(options.env || {}) };
  console.log(`\n[QXwap production gate] $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false
  });

  if (command === "rg" && result.status === 1) return;
  if (result.status !== 0) process.exit(result.status || 1);
}

for (const [command, args, options] of commands) {
  run(command, args, options);
}

console.log(
  "\n[QXwap production gate] passed",
  JSON.stringify(
    {
      apiBase: backendDomain,
      frontendOrigin,
      basePath,
      note: "This is a local gate. Run preflight:frontend and smoke:api again against the real Render URL after deploy."
    },
    null,
    2
  )
);
