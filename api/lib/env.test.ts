import { describe, expect, it } from "vitest";
import { parseServerEnv } from "./env";

describe("parseServerEnv", () => {
  it("accepts local development defaults", () => {
    const env = parseServerEnv({
      NODE_ENV: "development",
      DATABASE_URL: "./data/pglite",
    });

    expect(env.databaseUrl).toBe("./data/pglite");
    expect(env.frontendOrigin).toBe("http://localhost:3000");
    expect(env.port).toBe(3000);
    expect(env.sessionSecret).toBe("default-secret-change-me");
    expect(env.r2).toBeNull();
    expect(env.vapid).toBeNull();
  });

  it("fails fast when production env is missing required values", () => {
    expect(() => parseServerEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost:5432/qxwap",
    })).toThrowError(/FRONTEND_ORIGIN is required/);
  });

  it("rejects incomplete R2 config", () => {
    expect(() => parseServerEnv({
      NODE_ENV: "development",
      DATABASE_URL: "./data/pglite",
      R2_ACCOUNT_ID: "account",
      R2_BUCKET_NAME: "bucket",
    })).toThrowError(/Cloudflare R2 config is incomplete/);
  });

  it("rejects incomplete VAPID config", () => {
    expect(() => parseServerEnv({
      NODE_ENV: "development",
      DATABASE_URL: "./data/pglite",
      VAPID_PUBLIC_KEY: "public-key",
    })).toThrowError(/Web Push VAPID config is incomplete/);
  });
});
