import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "./data/pglite";
const isPglitePath = !databaseUrl.startsWith("postgres") && !databaseUrl.startsWith("postgresql");
const resolvedDatabaseUrl = isPglitePath ? path.resolve(process.cwd(), databaseUrl) : databaseUrl;

if (isPglitePath) {
  fs.mkdirSync(path.dirname(resolvedDatabaseUrl), { recursive: true });
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  ...(isPglitePath ? { driver: "pglite" as const } : {}),
  dbCredentials: {
    url: resolvedDatabaseUrl,
  },
});
