import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError, handleError } from "../lib/http";
import { pool } from "@workspace/db";

const router = Router();

// ─── POST /blocks ─────────────────────────────────────────────
router.post("/blocks", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = z.object({ blockedUserId: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { sendValidationError(res, "ข้อมูลไม่ถูกต้อง", parsed.error); return; }
  const { blockedUserId } = parsed.data;
  if (blockedUserId === req.user.id) { sendError(res, 400, "bad_request", "ไม่สามารถบล็อกตัวเองได้"); return; }
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO blocks(blocker_id, blocked_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [req.user.id, blockedUserId],
      );
      res.json({ ok: true });
    } finally { client.release(); }
  } catch (err) { handleError(res, err); }
});

// ─── DELETE /blocks/:userId ───────────────────────────────────
router.delete("/blocks/:userId", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [req.user.id, req.params.userId],
    );
    res.json({ ok: true });
  } finally { client.release(); }
});

// ─── GET /blocks ──────────────────────────────────────────────
router.get("/blocks", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT blocked_id, created_at FROM blocks WHERE blocker_id = $1 ORDER BY created_at DESC`,
      [req.user.id],
    );
    res.json({ blocks: rows });
  } finally { client.release(); }
});

export default router;
