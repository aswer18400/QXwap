import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, handleError } from "../lib/http";

const router = Router();

// ─── POST /follows/:userId ─── follow a user
router.post("/follows/:userId", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const followingId = String(req.params.userId);
  if (followingId === req.user.id) {
    sendError(res, 400, "bad_request", "ไม่สามารถติดตามตัวเองได้");
    return;
  }
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.user.id, followingId],
      );
      res.status(201).json({ following: true });
    } finally {
      client.release();
    }
  } catch (err) {
    handleError(res, err);
  }
});

// ─── DELETE /follows/:userId ─── unfollow a user
router.delete("/follows/:userId", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const followingId = String(req.params.userId);
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
        [req.user.id, followingId],
      );
      res.json({ following: false });
    } finally {
      client.release();
    }
  } catch (err) {
    handleError(res, err);
  }
});

// ─── GET /follows/status/:userId ─── check if following
router.get("/follows/status/:userId", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const followingId = String(req.params.userId);
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
        [req.user.id, followingId],
      );
      res.json({ following: rows.length > 0 });
    } finally {
      client.release();
    }
  } catch (err) {
    handleError(res, err);
  }
});

// ─── GET /follows/counts/:userId ─── follower + following counts
router.get("/follows/counts/:userId", async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `SELECT
          (SELECT COUNT(*) FROM follows WHERE following_id = $1) AS followers,
          (SELECT COUNT(*) FROM follows WHERE follower_id = $1)  AS following`,
        [userId],
      );
      const row = rows[0] ?? { followers: 0, following: 0 };
      res.json({ followers: Number(row.followers), following: Number(row.following) });
    } finally {
      client.release();
    }
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
