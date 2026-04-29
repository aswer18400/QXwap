import "dotenv/config";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  driver: "pglite",
  dbCredentials: {
    url: path.resolve(process.cwd(), process.env.DATABASE_URL || "./data/pglite"),
  },
});
