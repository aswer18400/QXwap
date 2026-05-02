import "dotenv/config";
import { z } from "zod";

const blankToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const optionalString = () => z.preprocess(blankToUndefined, z.string().optional());
const optionalUrl = (name: string) => z.preprocess(
  blankToUndefined,
  z.string().url({ message: `${name} must be a valid URL` }).optional(),
);

const rawEnvSchema = z.object({
  APP_ID: optionalString(),
  APP_SECRET: optionalString(),
  DATABASE_URL: z.preprocess(blankToUndefined, z.string().default("./data/pglite")),
  FRONTEND_ORIGIN: optionalUrl("FRONTEND_ORIGIN"),
  NODE_ENV: z.preprocess(blankToUndefined, z.enum(["development", "test", "production"]).default("development")),
  PORT: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(3000)),
  SESSION_SECRET: optionalString(),
  R2_ACCOUNT_ID: optionalString(),
  R2_ACCESS_KEY_ID: optionalString(),
  R2_SECRET_ACCESS_KEY: optionalString(),
  R2_BUCKET_NAME: optionalString(),
  R2_ENDPOINT: optionalUrl("R2_ENDPOINT"),
  R2_PUBLIC_URL: optionalUrl("R2_PUBLIC_URL"),
  VAPID_PRIVATE_KEY: optionalString(),
  VAPID_PUBLIC_KEY: optionalString(),
  VAPID_SUBJECT: optionalString(),
});

type RawEnv = z.infer<typeof rawEnvSchema>;

function formatZodPath(path: PropertyKey[]) {
  return path.length ? path.join(".") : "environment";
}

function createEnvError(messages: string[]) {
  return new Error(`Invalid environment configuration:\n- ${messages.join("\n- ")}`);
}

function validateGroupedEnv(parsed: RawEnv) {
  const issues: string[] = [];

  if (parsed.NODE_ENV === "production") {
    if (!parsed.FRONTEND_ORIGIN) {
      issues.push("FRONTEND_ORIGIN is required when NODE_ENV=production.");
    }
    if (!parsed.SESSION_SECRET) {
      issues.push("SESSION_SECRET is required when NODE_ENV=production.");
    } else if (parsed.SESSION_SECRET.length < 32) {
      issues.push("SESSION_SECRET must be at least 32 characters when NODE_ENV=production.");
    }
  }

  const requiredR2Keys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ] as const;
  const hasAnyR2 = requiredR2Keys.some((key) => parsed[key]) || !!parsed.R2_ENDPOINT || !!parsed.R2_PUBLIC_URL;
  if (hasAnyR2) {
    const missing = requiredR2Keys.filter((key) => !parsed[key]);
    if (missing.length) {
      issues.push(`Cloudflare R2 config is incomplete. Missing: ${missing.join(", ")}.`);
    }
  }

  const requiredVapidKeys = [
    "VAPID_SUBJECT",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
  ] as const;
  const hasAnyVapid = requiredVapidKeys.some((key) => parsed[key]);
  if (hasAnyVapid) {
    const missing = requiredVapidKeys.filter((key) => !parsed[key]);
    if (missing.length) {
      issues.push(`Web Push VAPID config is incomplete. Missing: ${missing.join(", ")}.`);
    }

    if (parsed.VAPID_SUBJECT && !/^(mailto:|https:\/\/)/.test(parsed.VAPID_SUBJECT)) {
      issues.push("VAPID_SUBJECT must start with mailto: or https://.");
    }
  }

  if (issues.length) {
    throw createEnvError(issues);
  }
}

export function parseServerEnv(source: NodeJS.ProcessEnv = process.env) {
  const result = rawEnvSchema.safeParse(source);

  if (!result.success) {
    throw createEnvError(result.error.issues.map((issue) => `${formatZodPath(issue.path)}: ${issue.message}`));
  }

  const parsed = result.data;
  validateGroupedEnv(parsed);

  const defaultSessionSecret = parsed.NODE_ENV === "production" ? "" : "default-secret-change-me";
  const hasCompleteR2Config = !!(
    parsed.R2_ACCOUNT_ID
    && parsed.R2_ACCESS_KEY_ID
    && parsed.R2_SECRET_ACCESS_KEY
    && parsed.R2_BUCKET_NAME
  );
  const hasCompleteVapidConfig = !!(
    parsed.VAPID_SUBJECT
    && parsed.VAPID_PUBLIC_KEY
    && parsed.VAPID_PRIVATE_KEY
  );

  return {
    appId: parsed.APP_ID ?? "",
    appSecret: parsed.APP_SECRET ?? "",
    databaseUrl: parsed.DATABASE_URL,
    frontendOrigin: parsed.FRONTEND_ORIGIN ?? "http://localhost:3000",
    isProduction: parsed.NODE_ENV === "production",
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    r2: hasCompleteR2Config
      ? {
          accountId: parsed.R2_ACCOUNT_ID!,
          accessKeyId: parsed.R2_ACCESS_KEY_ID!,
          bucketName: parsed.R2_BUCKET_NAME!,
          endpoint: parsed.R2_ENDPOINT ?? `https://${parsed.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          publicUrl: parsed.R2_PUBLIC_URL ?? "",
          secretAccessKey: parsed.R2_SECRET_ACCESS_KEY!,
        }
      : null,
    sessionSecret: parsed.SESSION_SECRET ?? defaultSessionSecret,
    vapid: hasCompleteVapidConfig
      ? {
          privateKey: parsed.VAPID_PRIVATE_KEY!,
          publicKey: parsed.VAPID_PUBLIC_KEY!,
          subject: parsed.VAPID_SUBJECT!,
        }
      : null,
  };
}

export const env = parseServerEnv();
