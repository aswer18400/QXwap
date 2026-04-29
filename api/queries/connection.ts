import { drizzle } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import path from "node:path";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>> | ReturnType<typeof drizzlePg<typeof fullSchema>>;
let client: PGlite | Pool;

export async function getDb() {
  if (!instance) {
    const dbUrl = env.databaseUrl;
    const isPglitePath = !dbUrl?.startsWith("postgres") && !dbUrl?.startsWith("postgresql");

    if (env.isProduction && !isPglitePath) {
      // Production with real PostgreSQL
      if (!dbUrl) {
        throw new Error("DATABASE_URL must be set to a valid PostgreSQL connection string in production");
      }
      const pool = new Pool({ connectionString: dbUrl });
      client = pool;
      instance = drizzlePg(pool, { schema: fullSchema });
    } else {
      // Development OR production with PGlite (embedded PostgreSQL)
      const dataDir = path.resolve(process.cwd(), dbUrl || "./data/pglite");
      console.log("[DB] Connecting to PGlite at", dataDir);
      const pglite = new PGlite(dataDir);
      await pglite.waitReady;
      client = pglite;
      instance = drizzle(pglite, { schema: fullSchema });
    }
  }
  return instance;
}

export async function getPgClient() {
  if (!client) {
    await getDb();
  }
  return client!;
}
