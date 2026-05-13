#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

function valueOf(name, fallback = "") {
  const match = process.argv.slice(2).find((arg) => arg.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : fallback;
}

const target = valueOf("--target", "all");
const production = args.has("--production") || process.env.NODE_ENV === "production";
const checkHealth = args.has("--health");
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

export function normalizeApiBase(rawValue) {
  const raw = String(rawValue || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

function isLocalhost(url) {
  return /(^|\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);
}

function validateFrontend() {
  const apiBase = normalizeApiBase(process.env.API_BASE_URL || process.env.API_BASE || process.env.VITE_API_BASE);
  if (!apiBase) {
    fail("API_BASE_URL is required for frontend deploy preflight");
    return "";
  }
  if (!/^https?:\/\//i.test(apiBase)) fail("API_BASE_URL must be an absolute http(s) URL");
  if (apiBase.includes("/api/api")) fail("API_BASE_URL must not contain /api/api");
  if (!apiBase.endsWith("/api")) fail("Normalized API base must end with /api");
  if (production && !apiBase.startsWith("https://")) fail("Production API_BASE_URL must use https");
  if (production && isLocalhost(apiBase)) fail("Production API_BASE_URL must not point to localhost");
  return apiBase;
}

function validateBackend() {
  const env = process.env;
  const hasSupabaseUrl = Boolean(env.SUPABASE_URL);
  const hasSupabaseKey = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
  const hasStorageBucket = Boolean(env.STORAGE_BUCKET);

  if (production) {
    if (!env.DATABASE_URL) fail("DATABASE_URL is required for backend production deploy");
    if (!env.FRONTEND_ORIGIN || env.FRONTEND_ORIGIN === "*") fail("FRONTEND_ORIGIN must be explicit in production");
    if (env.FRONTEND_ORIGIN && !env.FRONTEND_ORIGIN.startsWith("https://")) fail("Production FRONTEND_ORIGIN must use https");
    if (!env.SESSION_SECRET || env.SESSION_SECRET === "change-me-in-production" || env.SESSION_SECRET === "dev-qxwap-secret") {
      fail("SESSION_SECRET must be a real production secret");
    }
  } else if (!env.SESSION_SECRET) {
    warn("SESSION_SECRET is not set; API will use development fallback only outside production");
  }

  if ((hasSupabaseUrl || hasSupabaseKey || hasStorageBucket) && !(hasSupabaseUrl && hasSupabaseKey && hasStorageBucket)) {
    fail("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STORAGE_BUCKET must be set together");
  }
}

async function healthCheck(apiBase) {
  if (!apiBase) return;
  const url = `${apiBase}/health`;
  const response = await fetch(url);
  if (!response.ok) fail(`API health check failed: ${url} returned ${response.status}`);
  const data = await response.json().catch(() => ({}));
  if (data.ok !== true) fail(`API health check did not return ok=true: ${url}`);
  if (data.required_tables !== data.required_tables_expected) fail("API health reports missing required tables");
}

if (!["frontend", "backend", "all"].includes(target)) {
  fail("--target must be frontend, backend, or all");
}

let apiBase = "";
if (target === "frontend" || target === "all") apiBase = validateFrontend();
if (target === "backend" || target === "all") validateBackend();
if (checkHealth) await healthCheck(apiBase);

for (const message of warnings) console.warn(`[QXwap preflight] warning: ${message}`);

if (errors.length) {
  console.error("[QXwap preflight] failed");
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}

console.log("[QXwap preflight] passed", JSON.stringify({ target, production, apiBase: apiBase || undefined, health: checkHealth }, null, 2));
