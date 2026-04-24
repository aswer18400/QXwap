import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, notificationsTable } from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();

// ─── GET /notifications ──────────────────────────────────────

router.get(
  "/notifications",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user.id))
      .orderBy(desc(notificationsTable.createdAt));

    res.json({ notifications: rows });
  },
);

// ─── POST /notifications/read ────────────────────────────────
// Body: { ids?: string[] }
// Omit ids to mark all as read.

const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
});

router.post(
  "/notifications/read",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "ข้อมูลไม่ถูกต้อง", parsed.error);
      return;
    }

    const { ids } = parsed.data;
    const userId = req.user.id;

    const filter =
      ids && ids.length > 0
        ? and(
            eq(notificationsTable.userId, userId),
            inArray(notificationsTable.id, ids),
          )
        : eq(notificationsTable.userId, userId);

    const updated = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(filter)
      .returning();

    res.json({ updated: updated.length });
  },
);

export default router;
