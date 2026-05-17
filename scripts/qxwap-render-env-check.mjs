#!/usr/bin/env node

const required = [
  "DATABASE_URL",
  "SESSION_SECRET",
  "FRONTEND_ORIGIN"
];

const supabase = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STORAGE_BUCKET"
];

const missing = required.filter((name) => !process.env[name]);
const hasAnySupabase = supabase.some((name) => process.env[name]);
const missingSupabase = hasAnySupabase ? supabase.filter((name) => !process.env[name]) : [];

if (missing.length || missingSupabase.length) {
  for (const name of missing) console.error("missing", name);
  for (const name of missingSupabase) console.error("missing supabase", name);
  process.exit(1);
}

console.log("QXwap environment check passed");
