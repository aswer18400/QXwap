#!/usr/bin/env node

// Interactive end-to-end deploy helper. Prompts for the two secrets that
// must be retrieved by hand from the Supabase dashboard, validates the env,
// then loops on /api/health and /api/version until the new runtime is live,
// finally runs the smoke test. Designed to be the only command the user
// has to type once Supabase + Render are configured.
//
// Run from repo root:
//   node scripts/qxwap-deploy-now.mjs

import readline from "node:readline";
import { Writable } from "node:stream";
import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import url from "node:url";

const SUPABASE_REF = "cpradtvneftyeflwjvmx";
const SUPABASE_URL = `https://${SUPABASE_REF}.supabase.co`;
const STORAGE_BUCKET = "qxwap";
const FRONTEND_ORIGIN = "https://aswer18400.github.io";
const RENDER_URL = "https://qxwap-api.onrender.com";
const RENDER_DASHBOARD = "https://dashboard.render.com/web/srv-d7mfphu7r5hc73868seg";
const SUPABASE_API_PAGE = `https://supabase.com/dashboard/project/${SUPABASE_REF}/settings/api`;
const SUPABASE_DB_PAGE = `https://supabase.com/dashboard/project/${SUPABASE_REF}/settings/database`;

const repoRoot = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));

const reset = "\x1b[0m";
const bold  = "\x1b[1m";
const green = "\x1b[32m";
const yellow = "\x1b[33m";
const red = "\x1b[31m";
const cyan = "\x1b[36m";
const dim = "\x1b[2m";

function banner(text) {
  console.log("\n" + cyan + bold + text + reset + "\n" + dim + "─".repeat(text.length) + reset);
}
function ok(text)   { console.log(green + "✓ " + reset + text); }
function warn(text) { console.log(yellow + "⚠ " + reset + text); }
function fail(text) { console.log(red + "✗ " + reset + text); }
function step(n, text) { console.log("\n" + bold + `[${n}] ` + reset + text); }

function ask(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (a) => { rl.close(); resolve(a); }));
}

// Hidden prompt for secrets — does not echo to terminal
function askHidden(prompt) {
  return new Promise((resolve) => {
    const mutedOutput = new Writable({
      write(chunk, encoding, cb) {
        const s = chunk.toString();
        // Let the prompt itself through; suppress everything after first \n is typed
        process.stdout.write(s);
        cb();
      }
    });
    const rl = readline.createInterface({ input: process.stdin, output: mutedOutput, terminal: true });
    rl.stdoutMuted = true;
    rl._writeToOutput = function _writeToOutput(_) { /* swallow */ };
    process.stdout.write(prompt);
    rl.question("", (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer); });
  });
}

async function pause(prompt) {
  await ask(yellow + prompt + " (Enter when done) " + reset);
}

async function pollUntil(label, fn, { everyMs = 5000, timeoutMs = 5 * 60 * 1000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    process.stdout.write(`\r  ${dim}attempt ${attempt}…${reset} `);
    const res = await fn();
    if (res.ok) {
      process.stdout.write("\r" + " ".repeat(40) + "\r");
      ok(label + " — " + res.detail);
      return res;
    }
    process.stdout.write(`\r  ${dim}attempt ${attempt}: ${res.detail}${reset}` + " ".repeat(20) + "\r");
    await new Promise((r) => setTimeout(r, everyMs));
  }
  process.stdout.write("\n");
  fail(label + " timed out after " + Math.round(timeoutMs / 1000) + "s");
  return { ok: false, detail: "timeout" };
}

async function fetchJson(url, timeoutMs = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: c.signal });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch (_) {}
    return { status: res.status, body, text };
  } catch (e) {
    return { status: 0, error: e.message };
  } finally {
    clearTimeout(t);
  }
}

function runCheckRenderEnv(env) {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "qxwap-render-env-check.mjs")],
    { cwd: repoRoot, env: { ...process.env, ...env }, encoding: "utf8" }
  );
  return result;
}

function runSmoke(env) {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "qxwap-api-smoke.mjs")],
    { cwd: repoRoot, env: { ...process.env, ...env }, encoding: "utf8" }
  );
  return result;
}

async function main() {
  banner("QXwap one-command deploy helper");

  console.log("This will:");
  console.log("  1. Ask you for DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY (paste from Supabase)");
  console.log("  2. Generate a fresh SESSION_SECRET");
  console.log("  3. Validate everything locally with check:render-env");
  console.log("  4. Wait while you paste env vars into Render and trigger Manual Deploy");
  console.log("  5. Poll /api/health and /api/version until the new runtime is live");
  console.log("  6. Run the full API smoke test");

  console.log(`\n${bold}Open these in your browser:${reset}`);
  console.log(`  Supabase API:  ${cyan}${SUPABASE_API_PAGE}${reset}`);
  console.log(`  Supabase DB:   ${cyan}${SUPABASE_DB_PAGE}${reset}`);
  console.log(`  Render:        ${cyan}${RENDER_DASHBOARD}${reset}`);

  // Env var fast-path: if both secrets are already in process.env (e.g.
  // user prefixed the command: `DATABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm deploy:now`),
  // skip the interactive prompts entirely.
  let DATABASE_URL = (process.env.DATABASE_URL || "").trim();
  let SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (DATABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    step(1, "Found DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env (skipping prompts)");
    ok("DATABASE_URL host: " + (function () { try { return new URL(DATABASE_URL).hostname; } catch { return "<invalid>"; } })());
    ok("SERVICE_ROLE_KEY: " + SUPABASE_SERVICE_ROLE_KEY.slice(0, 8) + "…" + SUPABASE_SERVICE_ROLE_KEY.slice(-4));
  } else {
    if (!DATABASE_URL) {
      step(1, "Paste DATABASE_URL (from Supabase Database → Connection string → URI)");
      console.log(dim + "  Format: postgresql://postgres:<password>@db." + SUPABASE_REF + ".supabase.co:5432/postgres?sslmode=require" + reset);
      DATABASE_URL = (await ask("> ")).trim();
      if (!DATABASE_URL) { fail("empty DATABASE_URL"); process.exit(1); }
    }
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      step(2, "Paste SUPABASE_SERVICE_ROLE_KEY (Supabase API → service_role secret)");
      console.log(dim + "  Input is hidden. Starts with eyJ… or sb_secret_…" + reset);
      SUPABASE_SERVICE_ROLE_KEY = (await askHidden("> ")).trim();
      if (!SUPABASE_SERVICE_ROLE_KEY) { fail("empty SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
    }
  }

  const SESSION_SECRET = randomBytes(48).toString("base64");

  step(3, "Validating env locally with check:render-env");
  const envForRender = {
    NODE_ENV: "production",
    PORT: "3000",
    SESSION_SECRET,
    FRONTEND_ORIGIN,
    DATABASE_URL,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    STORAGE_BUCKET
  };
  const check = runCheckRenderEnv(envForRender);
  process.stdout.write(check.stdout || "");
  if (check.status !== 0) {
    process.stderr.write(check.stderr || "");
    fail("check:render-env failed. Fix the values above and rerun.");
    process.exit(1);
  }
  ok("env validated");

  step(4, "Paste these into Render → Environment, save, then Manual Deploy");
  console.log("");
  console.log(`  ${bold}NODE_ENV${reset}                     = production`);
  console.log(`  ${bold}PORT${reset}                         = 3000`);
  console.log(`  ${bold}FRONTEND_ORIGIN${reset}              = ${FRONTEND_ORIGIN}`);
  console.log(`  ${bold}SUPABASE_URL${reset}                 = ${SUPABASE_URL}`);
  console.log(`  ${bold}STORAGE_BUCKET${reset}               = ${STORAGE_BUCKET}`);
  console.log(`  ${bold}SESSION_SECRET${reset}               = ${SESSION_SECRET}`);
  console.log(`  ${bold}DATABASE_URL${reset}                 = (the one you just pasted; do not show on screen)`);
  console.log(`  ${bold}SUPABASE_SERVICE_ROLE_KEY${reset}    = (the one you just pasted; do not show on screen)`);
  console.log("");
  console.log("  Then click " + bold + "Manual Deploy → Clear build cache & deploy → Deploy latest commit" + reset);

  await pause("\nDone pasting and triggered the deploy?");

  step(5, "Polling /api/health (waiting for new QXwap runtime)");
  const health = await pollUntil(
    "/api/health says QXwap runtime",
    async () => {
      const r = await fetchJson(`${RENDER_URL}/api/health`);
      if (r.status === 0) return { ok: false, detail: "unreachable: " + (r.error || "?") };
      if (r.status !== 200) return { ok: false, detail: "HTTP " + r.status };
      if (r.body?.name !== "QXwap API") return { ok: false, detail: "still stub runtime" };
      if (r.body?.database !== "connected") return { ok: false, detail: "db: " + (r.body?.database || "?") };
      if (r.body?.required_tables !== r.body?.required_tables_expected) {
        return { ok: false, detail: `tables ${r.body?.required_tables}/${r.body?.required_tables_expected}` };
      }
      return { ok: true, detail: `db connected, ${r.body.required_tables}/${r.body.required_tables_expected} tables, ${r.body.items} items` };
    },
    { everyMs: 5000, timeoutMs: 10 * 60 * 1000 }
  );
  if (!health.ok) {
    fail("Deploy did not become healthy. Check Render logs: " + RENDER_DASHBOARD);
    process.exit(1);
  }

  step(6, "Verifying /api/version (commit + build)");
  const v = await fetchJson(`${RENDER_URL}/api/version`);
  if (v.status !== 200) { fail("/api/version HTTP " + v.status); process.exit(1); }
  const localSha = (() => {
    try { return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim(); }
    catch { return null; }
  })();
  console.log(`  commit:   ${v.body.commit}`);
  console.log(`  builtAt:  ${v.body.builtAt}`);
  console.log(`  node:     ${v.body.node}`);
  console.log(`  env:      ${v.body.env}`);
  if (localSha && v.body.commit?.slice(0, 40) === localSha.slice(0, 40)) ok("commit matches local HEAD");
  else if (localSha) warn(`commit (${v.body.commit?.slice(0,7)}) does not match local HEAD (${localSha.slice(0,7)}). Render may be deploying a different branch.`);

  step(7, "Running basic API smoke (signup → upload → item → search → offer)");
  const smoke = runSmoke({ API_BASE_URL: `${RENDER_URL}/api` });
  process.stdout.write(smoke.stdout || "");
  if (smoke.status !== 0) {
    process.stderr.write(smoke.stderr || "");
    fail("smoke:api failed");
    process.exit(1);
  }

  step(8, "Running two-session full smoke (owner gating + filters + profile + offer + shipment)");
  const full = spawnSync(
    process.execPath,
    [path.join(repoRoot, "scripts", "qxwap-full-smoke.mjs")],
    { cwd: repoRoot, env: { ...process.env, API_BASE_URL: `${RENDER_URL}/api` }, encoding: "utf8" }
  );
  process.stdout.write(full.stdout || "");
  if (full.status !== 0) {
    process.stderr.write(full.stderr || "");
    fail("smoke:full failed — see the FAIL lines above");
    process.exit(1);
  }

  banner("🎉 Deploy verified");
  console.log("");
  ok("API runtime is the new QXwap build");
  ok("Database connected, all tables present");
  ok("Smoke test passed (signup, upload, item, search, offer all work end-to-end)");
  console.log("");
  console.log(bold + "Next:" + reset + " open " + cyan + "https://aswer18400.github.io/QXwap/status.html" + reset);
  console.log("and run the browser click-through in " + cyan + "docs/ui-qa-checklist.md" + reset + ".");
}

main().catch((e) => {
  fail("Unexpected error: " + (e.stack || e.message || e));
  process.exit(1);
});
