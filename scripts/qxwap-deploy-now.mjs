#!/usr/bin/env node

const hookUrl = process.env.RENDER_DEPLOY_HOOK_URL;

if (!hookUrl) {
  console.error("RENDER_DEPLOY_HOOK_URL is required");
  process.exit(1);
}

const response = await fetch(hookUrl, { method: "POST" });

if (!response.ok) {
  console.error("Deploy hook failed", response.status);
  process.exit(1);
}

console.log("Deploy triggered");
