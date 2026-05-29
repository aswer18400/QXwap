#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const asJson = args.has("--json");
const reportDir = path.resolve(process.env.PRODUCT_READINESS_REPORT_DIR || "/tmp/qxwap-product-readiness");
const statusPath = path.join(reportDir, "status.json");
const latestPath = path.join(reportDir, "latest.json");

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

function formatRelativeTime(iso) {
  if (!iso) return "unknown";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return iso;
  const absMs = Math.abs(diffMs);
  const minutes = Math.round(absMs / 60_000);
  if (minutes < 1) return diffMs >= 0 ? "just now" : "in <1m";
  if (minutes < 60) return diffMs >= 0 ? `${minutes}m ago` : `in ${minutes}m`;
  const hours = Math.round(minutes / 60);
  return diffMs >= 0 ? `${hours}h ago` : `in ${hours}h`;
}

function buildPayload(status, latest) {
  const severity = latest?.severitySummary || {};
  const scores = latest?.scores || {};
  const generatedAt = latest?.generatedAt || null;
  const staleMs = status?.lastUpdatedAt ? Date.now() - new Date(status.lastUpdatedAt).getTime() : null;
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    reportDir,
    status: status || {},
    latest: latest
      ? {
          generatedAt,
          ready: latest.ready,
          score: scores.overall ?? null,
          severitySummary: severity,
          flows: latest.flows || []
        }
      : null,
    freshness: {
      statusLastUpdatedAt: status?.lastUpdatedAt || null,
      statusAgeMs: Number.isFinite(staleMs) ? staleMs : null,
      statusStale: Number.isFinite(staleMs) ? staleMs > 45 * 60 * 1000 : true,
      latestGeneratedAt: generatedAt
    }
  };
}

function renderDashboard(payload) {
  const lines = [];
  lines.push("QXwap Product Readiness");
  lines.push("");
  lines.push(`State: ${payload.status.state || "unknown"} / ${payload.status.phase || "unknown"}`);
  lines.push(`PID: ${payload.status.pid || "unknown"}`);
  lines.push(`Last heartbeat: ${payload.freshness.statusLastUpdatedAt || "unknown"} (${formatRelativeTime(payload.freshness.statusLastUpdatedAt)})`);
  lines.push(`Next run: ${payload.status.nextRunAt || "n/a"}${payload.status.nextRunAt ? ` (${formatRelativeTime(payload.status.nextRunAt)})` : ""}`);
  lines.push(`Stop at: ${payload.status.stopAtIso || "unknown"}`);
  lines.push(`Freshness: ${payload.freshness.statusStale ? "stale" : "fresh"}`);
  lines.push("");
  if (payload.latest) {
    lines.push(`Latest score: ${payload.latest.score}/100`);
    lines.push(`Ready: ${payload.latest.ready ? "yes" : "no"}`);
    lines.push(
      `Severity: blocker ${payload.latest.severitySummary.blocker || 0} / critical ${payload.latest.severitySummary.critical || 0} / major ${payload.latest.severitySummary.major || 0} / minor ${payload.latest.severitySummary.minor || 0}`
    );
    lines.push(`Latest completed round: ${payload.latest.generatedAt || "unknown"} (${formatRelativeTime(payload.latest.generatedAt)})`);
    const failingFlows = (payload.latest.flows || [])
      .filter((flow) => flow.status !== "pass" && flow.status !== "n/a")
      .map((flow) => `${flow.flow}:${flow.status}`);
    lines.push(`Risky flows: ${failingFlows.length ? failingFlows.join(", ") : "none"}`);
  } else {
    lines.push("Latest score: n/a");
    lines.push("Ready: unknown");
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const [status, latest] = await Promise.all([readJson(statusPath), readJson(latestPath)]);
  const payload = buildPayload(status, latest);
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  process.stdout.write(renderDashboard(payload));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
