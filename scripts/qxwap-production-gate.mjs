#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";

const backendDomain = process.env.API_BASE_URL || process.env.API_BASE || "https://qxwap-api.example.com/api";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "https://aswer18400.github.io";
const basePath = process.env.BASE_PATH || "/QXwap/";
const sessionSecret =
  process.env.SESSION_SECRET || "local-production-gate-secret-that-is-long-enough-for-preflight";
const databaseUrl =
  process.env.DATABASE_URL || "postgresql://user:pass@example.com:5432/qxwap?sslmode=require";
const localSmokePort = process.env.LOCAL_SMOKE_PORT || "8791";
const localSmokeApiBase = `http://127.0.0.1:${localSmokePort}/api`;
const localSmokeDataDir = process.env.PGLITE_DATA_DIR || `.data/qxwap-production-gate-${localSmokePort}`;
const localSmokeSessionSecret =
  process.env.LOCAL_SMOKE_SESSION_SECRET || "local-smoke-session-secret-that-is-long-enough";

const commands = [
  ["pnpm", ["run", "typecheck"]],
  ["pnpm", ["--filter", "@workspace/api-server", "test"]],
  ["pnpm", ["--filter", "@workspace/api-server", "build"]],
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
  ["pnpm", ["prepare:web-dist"], { env: { BASE_PATH: basePath, API_BASE: backendDomain } }],
  [
    "rg",
    ["-n", "^(<<<<<<<|=======|>>>>>>>)", "AI_START_HERE.md", "README.md", "docs", "scripts", ".github", "package.json", "render.yaml"]
  ]
];

function run(command, args, options = {}) {
  const envOverrides = Object.prototype.hasOwnProperty.call(options, "env") ? options.env || {} : options;
  const env = { ...process.env, ...envOverrides };
  console.log(`\n[QXwap production gate] $ ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false
  });

  if (command === "rg" && result.status === 1) return;
  if (result.status !== 0) {
    const error = new Error(`Command failed: ${command} ${args.join(" ")}`);
    error.exitCode = result.status || 1;
    throw error;
  }
}

async function fetchJson(url, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}
    return { ok: response.ok, status: response.status, body, text };
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForLocalHealth() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const result = await fetchJson(`${localSmokeApiBase}/health`);
    if (result.ok && result.body?.ok === true && result.body?.database === "connected") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Local smoke API did not become healthy at ${localSmokeApiBase}/health`);
}

async function runLocalSmoke() {
  console.log(`\n[QXwap production gate] starting local smoke API on ${localSmokeApiBase}`);
  const child = spawn("node", ["dist/server.js"], {
    cwd: `${process.cwd()}/apps/api`,
    env: {
      ...process.env,
      PORT: localSmokePort,
      PGLITE_DATA_DIR: localSmokeDataDir,
      FRONTEND_ORIGIN: "http://localhost:5173",
      SESSION_SECRET: localSmokeSessionSecret
    },
    stdio: "inherit",
    shell: false
  });

  let closed = false;
  child.on("exit", () => {
    closed = true;
  });

  try {
    await waitForLocalHealth();
    run("pnpm", ["smoke:api"], { API_BASE_URL: localSmokeApiBase });
    run("pnpm", ["smoke:full"], {
      API_BASE: localSmokeApiBase,
      API_BASE_URL: localSmokeApiBase,
      FRONTEND_ORIGIN: "http://localhost:5173",
      BASE_PATH: "/"
    });
  } finally {
    if (!closed) child.kill("SIGTERM");
  }
}

async function main() {
  for (const [command, args, options] of commands) {
    run(command, args, options);
  }

  await runLocalSmoke();

  const gitBranch = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8"
  }).stdout.trim();
  const gitCommit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: process.cwd(), encoding: "utf8" }).stdout.trim();
  console.log(
    "\n[QXwap production gate] passed",
    JSON.stringify(
      {
        apiBase: backendDomain,
        frontendOrigin,
        basePath,
        localSmokeApiBase,
        gitBranch,
        gitCommit,
        note: "Live deploy still needs preflight:frontend plus real Render/Supabase smoke after publish."
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("\n[QXwap production gate] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(error?.exitCode || 1);
});
