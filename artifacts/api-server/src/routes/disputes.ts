import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendValidationError, sendError, handleError } from "../lib/http";
import { pool } from "@workspace/db";

const router = Router();

const REASONS = ["fraud", "item_not_as_described", "no_show", "harassment", "other"] as const;

const disputeSchema = z.object({
  reportedUserId: z.string().min(1),
  dealId: z.string().optional(),
  reason: z.enum(REASONS),
  detail: z.string().max(2000).optional(),
});

// ─── POST /disputes ───────────────────────────────────────────
router.post("/disputes", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;

  const parsed = disputeSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลการรายงานไม่ถูกต้อง", parsed.error);
    return;
  }

  const { reportedUserId, dealId, reason, detail } = parsed.data;
  if (reportedUserId === req.user.id) {
    sendError(res, 400, "bad_request", "ไม่สามารถรายงานตัวเองได้");
    return;
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO disputes(reporter_id, reported_user_id, deal_id, reason, detail)
         VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [req.user.id, reportedUserId, dealId ?? null, reason, detail ?? null],
      );
      res.status(201).json({ disputeId: rows[0]!.id });
    } finally {
      client.release();
    }
  } catch (err) {
    handleError(res, err);
  }
});

// ─── GET /disputes/mine ───────────────────────────────────────
router.get("/disputes/mine", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT * FROM disputes WHERE reporter_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.user.id],
    );
    res.json({ disputes: rows });
  } finally {
    client.release();
  }
});

export default router;
