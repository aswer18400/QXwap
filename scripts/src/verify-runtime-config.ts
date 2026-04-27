import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function assertContains(haystack: string, needle: string, source: string) {
  if (!haystack.includes(needle)) {
    throw new Error(`Missing expected content in ${source}: ${needle}`);
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const workflow = readRepoFile(".github/workflows/deploy-pages.yml");
assertContains(workflow, "NORMALIZED_API_BASE", ".github/workflows/deploy-pages.yml");
assertContains(workflow, "window.__API_BASE__", ".github/workflows/deploy-pages.yml");
assertContains(workflow, 'HEALTH_URL="${NORMALIZED_API_BASE}/health"', ".github/workflows/deploy-pages.yml");

const webIndex = readRepoFile("artifacts/web-app/index.html");
assertContains(webIndex, "function normalizeApiBase", "artifacts/web-app/index.html");
assertContains(webIndex, "const API_BASE = normalizeApiBase", "artifacts/web-app/index.html");

const webApi = readRepoFile("artifacts/web-app/src/api.js");
assertContains(webApi, "function normalizeApiBase", "artifacts/web-app/src/api.js");
assertContains(webApi, "const BASE = normalizeApiBase(rawApiBase)", "artifacts/web-app/src/api.js");

console.log("runtime config verification passed");
