import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import path from "node:path";
import fs from "node:fs";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";

const app = new Hono<{ Bindings: HttpBindings }>();
const DB_HEALTH_TIMEOUT_MS = 3000;

app.get("/api/health", (c) => c.json({ ok: true }));

app.use(cors({
  origin: env.isProduction ? (process.env.FRONTEND_ORIGIN || "") : "http://localhost:3000",
  credentials: true,
}));

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
app.get("/uploads/*", async (c) => {
  const filePath = path.join(UPLOAD_DIR, c.req.path.replace("/uploads/", ""));
  if (!filePath.startsWith(UPLOAD_DIR)) return c.json({ error: "Forbidden" }, 403);
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return c.json({ error: "Not found" }, 404);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    const data = fs.readFileSync(filePath);
    return new Response(data, { headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" } });
  } catch {
    return c.json({ error: "Not found" }, 404);
  }
});

app.get("/api/ready", async (c) => {
  try {
    await Promise.race([
      (async () => {
        const db = await getDb();
        await db.execute(sql`select 1`);
      })(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database health check timed out")), DB_HEALTH_TIMEOUT_MS);
      }),
    ]);
    return c.json({ ok: true, database: true });
  } catch (error) {
    console.error("[health] readiness check failed", error);
    return c.json({ ok: false, database: false, message: "Database is not ready" }, 503);
  }
});

import authRoutes from "./routes/auth";
app.route("/api/auth", authRoutes);

import uploadRoutes from "./routes/upload";
app.use("/api/upload", bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.route("/api/upload", uploadRoutes);

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw.clone(),
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { createServer } = await import("node:http");
  const { getRequestListener } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = Number(process.env.PORT || 10000);
  const host = "0.0.0.0";
  const server = createServer(getRequestListener(app.fetch));
  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}
