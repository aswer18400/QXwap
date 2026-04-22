import { Router, type IRouter, type Request, type Response } from "express";
import { db, dealsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

const updateDealStageSchema = z.object({
  stage: z.string().trim().min(1),
});

router.patch(
  "/deals/:id/stage",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = updateDealStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "stage ไม่ถูกต้อง" });
      return;
    }

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, String(req.params.id)));
    if (!deal) {
      res.status(404).json({ error: "ไม่พบดีล" });
      return;
    }

    const isParticipant =
      deal.senderId === req.user.id || deal.receiverId === req.user.id;
    if (!isParticipant) {
      res.status(403).json({ error: "ไม่มีสิทธิ์อัปเดตดีลนี้" });
      return;
    }

    if (deal.stage === parsed.data.stage) {
      res.json({ deal });
      return;
    }

    const [updated] = await db
      .update(dealsTable)
      .set({ stage: parsed.data.stage })
      .where(eq(dealsTable.id, deal.id))
      .returning();

    const notifyUserId =
      req.user.id === deal.senderId ? deal.receiverId : deal.senderId;
    await db.insert(notificationsTable).values({
      userId: notifyUserId,
      actorId: req.user.id,
      type: "deal_stage_updated",
      title: "มีการอัปเดตสถานะดีล",
      body: parsed.data.stage,
      offerId: deal.offerId,
      dealId: deal.id,
    });

    res.json({ deal: updated });
  },
);

export default router;
