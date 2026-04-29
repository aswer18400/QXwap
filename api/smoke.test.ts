import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const TEST_DB_DIR = path.resolve(import.meta.dirname, "../data/smoke-test-db");

// Set env vars before any imports resolve the db connection
process.env.DATABASE_URL = TEST_DB_DIR;
process.env.SESSION_SECRET = "test-secret-32-chars-minimum-ok";
process.env.NODE_ENV = "development"; // use pglite

// Prepare the schema in beforeAll
let app: typeof import("./boot.ts").default;

beforeAll(async () => {
  // Ensure fresh test DB directory
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });

  // Push schema using drizzle-kit (creates all tables)
  execSync(`DATABASE_URL=${TEST_DB_DIR} npx drizzle-kit push --force`, {
    cwd: path.resolve(import.meta.dirname, ".."),
    stdio: "pipe",
  });

  const mod = await import("./boot.ts");
  app = mod.default;
}, 60_000);

async function req(path: string, opts: RequestInit = {}) {
  return app.request(`http://localhost${path}`, opts);
}

describe("API smoke tests", () => {
  it("GET /api/health returns ok", async () => {
    const res = await req("/api/health");
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("GET /api/auth/me returns user: null when not logged in", async () => {
    const res = await req("/api/auth/me");
    expect(res.status).toBe(200);
    const body = await res.json() as { user: null };
    expect(body.user).toBeNull();
  });

  it("POST /api/auth/signup creates a new user", async () => {
    const res = await req("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { email: string } };
    expect(body.user.email).toBe("test@example.com");
  });

  it("POST /api/auth/signup rejects duplicate email", async () => {
    await req("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com", password: "password123" }),
    });
    const res = await req("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@example.com", password: "password123" }),
    });
    expect(res.status).toBe(409);
  });

  it("POST /api/auth/signin succeeds with valid credentials", async () => {
    await req("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "signin@example.com", password: "mypassword" }),
    });
    const res = await req("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "signin@example.com", password: "mypassword" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { user: { email: string } };
    expect(body.user.email).toBe("signin@example.com");
  });

  it("POST /api/auth/signin rejects wrong password", async () => {
    const res = await req("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "signin@example.com", password: "wrong" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/signup rejects missing fields", async () => {
    const res = await req("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "only@example.com" }),
    });
    expect(res.status).toBe(400);
  });

  it("unknown /api/* route returns 404", async () => {
    const res = await req("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});
