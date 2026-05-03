import "dotenv/config";

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL || "./data/pglite",
  sessionSecret: process.env.SESSION_SECRET || "default-secret-change-me",
  port: parseInt(process.env.PORT || "3000"),
};
