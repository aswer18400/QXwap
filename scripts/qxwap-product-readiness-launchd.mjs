#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2);
const command = args[0] || "install";

const label = "com.qxwap.product-readiness-loop";
const plistPath = path.join(os.homedir(), "Library/LaunchAgents", `${label}.plist`);
const outputPath = "/tmp/qxwap-product-readiness-launchd.out";
const errorPath = "/tmp/qxwap-product-readiness-launchd.err";
const nodePath = process.execPath;
const loopScriptPath = path.join(repoRoot, "scripts/qxwap-product-readiness-loop.mjs");
const defaultIntervalMs = String(10 * 60 * 1000);

function computeStopAtBangkokNoon() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  const baseUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + 1, 5, 0, 0);
  return new Date(baseUtc).toISOString();
}

function buildPlist(stopAtIso) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xmlEscape(nodePath)}</string>
    <string>${xmlEscape(loopScriptPath)}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PRODUCT_READINESS_STOP_AT</key>
    <string>${xmlEscape(stopAtIso)}</string>
    <key>API_BASE_URL</key>
    <string>${xmlEscape(process.env.API_BASE_URL || "http://127.0.0.1:8787/api")}</string>
    <key>FRONTEND_URL</key>
    <string>${xmlEscape(process.env.FRONTEND_URL || "http://127.0.0.1:5174/")}</string>
    <key>PRODUCT_READINESS_REPORT_DIR</key>
    <string>${xmlEscape(process.env.PRODUCT_READINESS_REPORT_DIR || "/tmp/qxwap-product-readiness")}</string>
    <key>PRODUCT_READINESS_INTERVAL_MS</key>
    <string>${xmlEscape(process.env.PRODUCT_READINESS_INTERVAL_MS || defaultIntervalMs)}</string>
    <key>PATH</key>
    <string>${xmlEscape(process.env.PATH || "/usr/bin:/bin:/usr/sbin:/sbin")}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
  <key>StandardOutPath</key>
  <string>${outputPath}</string>
  <key>StandardErrorPath</key>
  <string>${errorPath}</string>
  <key>WorkingDirectory</key>
  <string>${repoRoot}</string>
</dict>
</plist>
`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function install() {
  const stopAtIso = process.env.PRODUCT_READINESS_STOP_AT || computeStopAtBangkokNoon();
  await fs.mkdir(path.dirname(plistPath), { recursive: true });
  await fs.writeFile(plistPath, buildPlist(stopAtIso));
  try {
    await execFileAsync("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath]);
  } catch {
    // ignore missing agent
  }
  await execFileAsync("launchctl", ["bootstrap", `gui/${process.getuid()}`, plistPath]);
  await execFileAsync("launchctl", ["enable", `gui/${process.getuid()}/${label}`]).catch(() => undefined);
  console.log(JSON.stringify({
    ok: true,
    label,
    plistPath,
    stopAtIso,
    intervalMs: process.env.PRODUCT_READINESS_INTERVAL_MS || defaultIntervalMs
  }, null, 2));
}

async function uninstall() {
  try {
    await execFileAsync("launchctl", ["bootout", `gui/${process.getuid()}`, plistPath]);
  } catch {
    // ignore
  }
  await fs.rm(plistPath, { force: true });
  console.log(JSON.stringify({ ok: true, label, removed: true }, null, 2));
}

async function status() {
  try {
    const { stdout } = await execFileAsync("launchctl", ["print", `gui/${process.getuid()}/${label}`]);
    console.log(stdout);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (command === "install") {
  await install();
} else if (command === "uninstall") {
  await uninstall();
} else if (command === "status") {
  await status();
} else {
  console.error("Usage: node scripts/qxwap-product-readiness-launchd.mjs [install|uninstall|status]");
  process.exit(1);
}
