import "dotenv/config";

export const env = {
  appId: process.env.APP_ID ?? "",
  appSecret: process.env.APP_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL || "./data/pglite",
  sessionSecret: process.env.SESSION_SECRET || "default-secret-change-me",
  port: parseInt(process.env.PORT || "3000"),
  r2: {
    bucket: process.env.R2_BUCKET || "",
    endpoint: process.env.R2_ENDPOINT || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    publicUrl: (process.env.R2_PUBLIC_URL || "").replace(/\/$/, ""),
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    email: process.env.VAPID_EMAIL || "mailto:admin@example.com",
  },
};
