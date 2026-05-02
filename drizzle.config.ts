import "dotenv/config";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL || "./data/pglite";
const isRemotePostgres = /^postgres(ql)?:\/\//i.test(databaseUrl);

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  driver: isRemotePostgres ? undefined : "pglite",
  dbCredentials: {
    url: isRemotePostgres ? databaseUrl : path.resolve(process.cwd(), databaseUrl),
  },
});
