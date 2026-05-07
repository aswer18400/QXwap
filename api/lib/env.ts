import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL || "";
const isProduction = process.env.NODE_ENV === "production";
const isPostgresDatabaseUrl = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction,
  databaseUrl: databaseUrl || "./data/pglite",
  hasDatabaseUrl: Boolean(databaseUrl),
  isPostgresDatabaseUrl,
  sessionSecret: process.env.SESSION_SECRET || "default-secret-change-me",
  port: parseInt(process.env.PORT || "10000"),
};
