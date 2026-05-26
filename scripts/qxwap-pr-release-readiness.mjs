#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const pr = readArg("--pr") || process.env.PR_NUMBER || "221";

function readArg(name) {
  const index = argv.indexOf(name);
  if (index >= 0 && argv[index + 1]) return argv[index + 1];
  const prefixed = argv.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : "";
}

function runGh(args) {
  const result = spawnSync("gh", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `gh ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function line(icon, text) {
  console.log(`${icon} ${text}`);
}

function summarizeChecks(statusCheckRollup) {
  const failing = [];
  const passing = [];
  const neutral = [];

  for (const check of statusCheckRollup || []) {
    const state = check.state || check.conclusion || check.status;
    const normalized = String(state || "").toLowerCase();
    const name = check.context || check.name || "unknown";
    if (normalized === "success") passing.push(name);
    else if (normalized === "neutral") neutral.push(name);
    else if (normalized === "failure" || normalized === "failed" || normalized === "error") failing.push(name);
  }

  return { failing, passing, neutral };
}

function isNetlifyContext(name) {
  return name.startsWith("netlify/") || name.includes("netlify") || name.includes("Header rules - ") || name.includes("Pages changed - ") || name.includes("Redirect rules - ");
}

function unique(values) {
  return [...new Set(values)];
}

async function main() {
  const raw = runGh([
    "pr",
    "view",
    String(pr),
    "--json",
    "number,title,url,state,isDraft,mergeStateStatus,reviewDecision,baseRefName,headRefName,assignees,statusCheckRollup"
  ]);
  const prData = JSON.parse(raw);
  const { failing, passing, neutral } = summarizeChecks(prData.statusCheckRollup);
  const uniqueFailing = unique(failing);
  const failingNetlify = uniqueFailing.filter(isNetlifyContext);
  const failingNonNetlify = uniqueFailing.filter((name) => !isNetlifyContext(name));
  const successfulNetlify = unique([...passing, ...neutral]).filter(isNetlifyContext);

  let ready = true;
  const blockers = [];

  if (prData.isDraft) {
    ready = false;
    blockers.push("PR is still draft");
  }

  if (prData.mergeStateStatus && !["CLEAN", "HAS_HOOKS", "UNKNOWN"].includes(prData.mergeStateStatus)) {
    ready = false;
    blockers.push(`mergeStateStatus=${prData.mergeStateStatus}`);
  }

  if (failingNonNetlify.length > 0) {
    ready = false;
    blockers.push(`non-Netlify checks failing: ${failingNonNetlify.join(", ")}`);
  }

  if (failingNetlify.length > 0) {
    ready = false;
    blockers.push(`Netlify checks failing: ${failingNetlify.join(", ")}`);
  }

  console.log(`QXwap PR release readiness -> #${prData.number}`);
  console.log(`${prData.title}`);
  console.log(`${prData.url}\n`);

  line(prData.isDraft ? "X" : "OK", `Draft status: ${prData.isDraft ? "draft" : "ready"}`);
  line(prData.mergeStateStatus === "CLEAN" ? "OK" : "-", `mergeStateStatus: ${prData.mergeStateStatus}`);
  line("-", `reviewDecision: ${prData.reviewDecision || "(none)"}`);
  line(prData.assignees?.length ? "OK" : "-", `assignees: ${prData.assignees?.map((a) => a.login).join(", ") || "(none)"}`);
  console.log("");

  if (successfulNetlify.length) {
    line("OK", `Netlify contexts already green/neutral: ${successfulNetlify.join(", ")}`);
  }

  if (failingNetlify.length) {
    line("X", `Netlify blocker(s): ${failingNetlify.join(", ")}`);
    if (successfulNetlify.length) {
      line("-", "Sibling Netlify previews on the same PR are already green, so the remaining Netlify failure is likely site-specific or stale.");
    }
  }

  if (failingNonNetlify.length) {
    line("X", `Repo blocker(s): ${failingNonNetlify.join(", ")}`);
  }

  console.log("\nNext steps:");
  if (failingNetlify.length) {
    line("1.", "Owner/site maintainer should inspect or disconnect the stale Netlify site before merge.");
  }
  if (prData.isDraft) {
    line("2.", "Reviewer should undraft PR after blockers are cleared.");
  }
  if (ready) {
    line("OK", "PR is ready for merge/deploy flow.");
    console.log("\nAfter merge run:");
    console.log("  API_BASE_URL=https://<render-backend-domain>/api FRONTEND_URL=https://<frontend-domain>/QXwap/ pnpm smoke:release");
    process.exit(0);
  }

  for (const blocker of blockers) {
    line("-", blocker);
  }
  process.exit(2);
}

main().catch((error) => {
  console.error("[QXwap release readiness] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
