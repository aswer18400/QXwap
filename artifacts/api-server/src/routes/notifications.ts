import { Router, type IRouter, type Request, type Response } from "express";
import { db, notificationsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get(
  "/notifications/mine",
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

router.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const [existing] = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.id, String(req.params.id)));

    if (!existing) {
      res.status(404).json({ error: "ไม่พบการแจ้งเตือน" });
      return;
    }

    if (existing.userId !== req.user.id) {
      res.status(403).json({ error: "ไม่อนุญาต" });
      return;
    }

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.id, existing.id))
      .returning();

    res.json({ notification: updated });
  },
);

export default router;
