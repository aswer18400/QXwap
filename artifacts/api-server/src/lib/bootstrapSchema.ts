import fs from "fs";
import path from "path";
import { logger } from "./logger";

interface SqlClient {
  query: (sql: string) => Promise<unknown>;
}

export function findBootstrapSchemaFile(): string | null {
  const candidates = [
    path.join(process.cwd(), "qxwap_supabase_schema_policy.sql"),
    path.join(process.cwd(), "..", "..", "qxwap_supabase_schema_policy.sql"),
    path.join(process.cwd(), "..", "qxwap_supabase_schema_policy.sql"),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) return file;
  }
  return null;
}

export async function applyBootstrapSchema(client: SqlClient): Promise<void> {
  const bootstrapSchema = findBootstrapSchemaFile();
  if (!bootstrapSchema) {
    logger.warn("migration.bootstrap_schema_not_found");
    return;
  }

  const sql = fs.readFileSync(bootstrapSchema, "utf8");
  await client.query(sql);
  logger.info({ bootstrapSchema }, "migration.bootstrap_schema_applied");
}
