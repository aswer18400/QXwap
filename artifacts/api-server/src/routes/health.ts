import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/healthz", async (_req, res) => {
  const start = Date.now();
  let db: "ok" | "error" = "ok";
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
  } catch {
    db = "error";
  }
  const status = db === "ok" ? "ok" : "degraded";
  res.status(200).json({
    status,
    db,
    uptime: Math.floor(process.uptime()),
    latencyMs: Date.now() - start,
    ts: new Date().toISOString(),
  });
});

export default router;
