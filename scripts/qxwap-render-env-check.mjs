#!/usr/bin/env node

// Validate the env vars you are about to paste into Render before pasting.
// Run with the values exported in your shell (do NOT commit them):
//
//   NODE_ENV=production \
//   PORT=3000 \
//   DATABASE_URL="postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres?sslmode=require" \
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_jwt> \
//   STORAGE_BUCKET=qxwap \
//   FRONTEND_ORIGIN=https://aswer18400.github.io \
//   SESSION_SECRET=<long-random> \
//   node scripts/qxwap-render-env-check.mjs
//
// Exits non-zero on the first hard problem. Prints WARN for soft issues.

const env = process.env;
const errors = [];
const warns = [];

function err(message) { errors.push(message); }
function warn(message) { warns.push(message); }

// --- NODE_ENV ---
if (env.NODE_ENV !== "production") err(`NODE_ENV must be "production", got "${env.NODE_ENV || ""}"`);

// --- PORT ---
if (!env.PORT) {
  warn("PORT not set; Render injects one automatically but render.yaml expects 3000");
} else if (!/^\d{2,5}$/.test(env.PORT)) {
  err(`PORT must be a numeric port, got "${env.PORT}"`);
}

// --- SESSION_SECRET ---
const ss = env.SESSION_SECRET || "";
if (!ss) {
  err("SESSION_SECRET is required");
} else if (ss === "change-me-in-production" || ss === "dev-qxwap-secret") {
  err("SESSION_SECRET must be a real production secret, not the dev fallback");
} else if (ss.length < 32) {
  err(`SESSION_SECRET is too short (${ss.length} chars); generate at least 32 chars of entropy`);
}

// --- FRONTEND_ORIGIN ---
const fo = env.FRONTEND_ORIGIN || "";
if (!fo) {
  err("FRONTEND_ORIGIN is required");
} else if (fo === "*") {
  err("FRONTEND_ORIGIN must be an explicit origin, not '*'");
} else if (!fo.startsWith("https://")) {
  err(`FRONTEND_ORIGIN must use https in production, got "${fo}"`);
} else if (fo.endsWith("/")) {
  err(`FRONTEND_ORIGIN must not have a trailing slash, got "${fo}"`);
} else {
  try {
    const u = new URL(fo);
    if (u.pathname && u.pathname !== "/") {
      err(`FRONTEND_ORIGIN must be origin only (scheme + host + optional port), got pathname "${u.pathname}"`);
    }
    if (u.search || u.hash) {
      err(`FRONTEND_ORIGIN must not contain query/hash, got "${fo}"`);
    }
  } catch (e) {
    err(`FRONTEND_ORIGIN is not a valid URL: ${e.message}`);
  }
}

// --- DATABASE_URL ---
const du = env.DATABASE_URL || "";
let dbHost = "";
if (!du) {
  err("DATABASE_URL is required");
} else if (!du.startsWith("postgres://") && !du.startsWith("postgresql://")) {
  err("DATABASE_URL must start with postgres:// or postgresql://");
} else {
  try {
    const u = new URL(du);
    dbHost = u.hostname;
    if (!u.password) warn("DATABASE_URL has no password; that's almost always wrong for Supabase");
    if (!u.pathname || u.pathname === "/") warn("DATABASE_URL has no database name in the path");
    const ssl = (u.searchParams.get("sslmode") || "").toLowerCase();
    if (ssl !== "require" && ssl !== "verify-full" && ssl !== "verify-ca") {
      warn(`DATABASE_URL should set sslmode=require for Supabase (got "${ssl || "<none>"}")`);
    }
    if (!/supabase\.co$/.test(u.hostname) && !/supabase\.com$/.test(u.hostname)) {
      warn(`DATABASE_URL host "${u.hostname}" does not look like a Supabase host`);
    }
  } catch (e) {
    err(`DATABASE_URL is not a valid URL: ${e.message}`);
  }
}

// --- SUPABASE_URL ---
const su = env.SUPABASE_URL || "";
let supabaseRef = "";
if (!su) {
  err("SUPABASE_URL is required when STORAGE is enabled");
} else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(su)) {
  err(`SUPABASE_URL must look like https://<ref>.supabase.co, got "${su}"`);
} else {
  const m = su.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/);
  supabaseRef = m ? m[1] : "";
  if (su.endsWith("/")) warn("SUPABASE_URL has a trailing slash; the server trims it, but cleaner without");
}

// --- DATABASE_URL host vs SUPABASE_URL ref cross-check ---
if (dbHost && supabaseRef) {
  // Direct connection: db.<ref>.supabase.co
  // Session pooler:  aws-0-<region>.pooler.supabase.com (no ref in host)
  if (dbHost.startsWith("db.") && !dbHost.includes(`.${supabaseRef}.`)) {
    err(`DATABASE_URL host (${dbHost}) does not match SUPABASE_URL ref (${supabaseRef}). Mismatched project.`);
  }
}

// --- SUPABASE_SERVICE_ROLE_KEY ---
const srk = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!srk) {
  err("SUPABASE_SERVICE_ROLE_KEY is required when STORAGE is enabled");
} else if (srk.startsWith("eyJ") && srk.split(".").length === 3) {
  // Legacy JWT-style key; decode role claim
  try {
    const payload = JSON.parse(Buffer.from(srk.split(".")[1], "base64url").toString());
    if (payload.role !== "service_role") {
      err(`SUPABASE_SERVICE_ROLE_KEY role claim is "${payload.role}", expected "service_role". You probably pasted the anon or publishable key.`);
    }
    if (supabaseRef && payload.ref && payload.ref !== supabaseRef) {
      err(`SUPABASE_SERVICE_ROLE_KEY ref claim "${payload.ref}" does not match SUPABASE_URL ref "${supabaseRef}".`);
    }
  } catch (e) {
    warn(`SUPABASE_SERVICE_ROLE_KEY looks like a JWT but could not be decoded: ${e.message}`);
  }
} else if (!srk.startsWith("sb_secret_") && !srk.startsWith("sbp_")) {
  warn("SUPABASE_SERVICE_ROLE_KEY format is unrecognized. Expected legacy JWT (eyJ...) or modern sb_secret_/sbp_ format.");
}

// --- STORAGE_BUCKET ---
const bucket = env.STORAGE_BUCKET || "";
if (!bucket) {
  err("STORAGE_BUCKET is required when storage env is enabled (set to 'qxwap')");
} else if (!/^[a-z0-9][a-z0-9._-]{0,62}$/.test(bucket)) {
  err(`STORAGE_BUCKET "${bucket}" contains invalid characters. Use lowercase alphanumerics, dot/dash/underscore.`);
}

// --- storage env all-or-nothing ---
const storageSet = [Boolean(env.SUPABASE_URL), Boolean(env.SUPABASE_SERVICE_ROLE_KEY), Boolean(env.STORAGE_BUCKET)].filter(Boolean).length;
if (storageSet !== 0 && storageSet !== 3) {
  err("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and STORAGE_BUCKET must be set together (got " + storageSet + "/3).");
}

// --- Forbidden combinations ---
if (du && du.includes("localhost")) err("DATABASE_URL points to localhost; production must use the Supabase host");
if (fo && (fo.includes("localhost") || fo.includes("127.0.0.1"))) err("FRONTEND_ORIGIN points to localhost; production must use the deployed origin");

// --- Output ---
if (errors.length) {
  console.error("[QXwap Render env check] FAILED");
  for (const m of errors) console.error("- ERROR:", m);
  for (const m of warns) console.error("- warn :", m);
  process.exit(1);
}

console.log("[QXwap Render env check] passed", JSON.stringify({
  node_env: env.NODE_ENV,
  port: env.PORT,
  frontend_origin: env.FRONTEND_ORIGIN,
  supabase_ref: supabaseRef,
  storage_bucket: env.STORAGE_BUCKET,
  database_host: dbHost
}, null, 2));

if (warns.length) {
  console.warn("");
  for (const m of warns) console.warn("- warn:", m);
}
