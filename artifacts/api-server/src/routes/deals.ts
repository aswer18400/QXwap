import { Router, type IRouter, type Request, type Response } from "express";
import { db, dealsTable, itemsTable, offersTable } from "@workspace/db";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

const dealStages = [
  "accepted",
  "logistics_pending",
  "shipped_or_pickup_set",
  "received",
  "completed",
  "canceled",
] as const;

type DealStage = (typeof dealStages)[number];

const updateDealStageSchema = z.object({
  stage: z.enum(dealStages),
});

const allowedTransitions: Record<DealStage, readonly DealStage[]> = {
  accepted: ["logistics_pending", "canceled"],
  logistics_pending: ["shipped_or_pickup_set", "canceled"],
  shipped_or_pickup_set: ["received", "canceled"],
  received: ["completed"],
  completed: [],
  canceled: [],
};

function isDealStage(stage: string): stage is DealStage {
  return dealStages.includes(stage as DealStage);
}

router.get("/deals/mine", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const uid = req.user.id;

  const rows = await db
    .select({
      deal: dealsTable,
      itemTitle: itemsTable.title,
      offerStatus: offersTable.status,
    })
    .from(dealsTable)
    .leftJoin(itemsTable, eq(dealsTable.targetItemId, itemsTable.id))
    .leftJoin(offersTable, eq(dealsTable.offerId, offersTable.id))
    .where(or(eq(dealsTable.senderId, uid), eq(dealsTable.receiverId, uid)))
    .orderBy(desc(dealsTable.createdAt));

  res.json({
    deals: rows.map((row) => ({
      ...row.deal,
      item: { title: row.itemTitle },
      offer: { status: row.offerStatus },
    })),
  });
});

router.get("/deals/:id", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const uid = req.user.id;
  const dealId = String(req.params.id);

  const [row] = await db
    .select({
      deal: dealsTable,
      itemTitle: itemsTable.title,
      offerStatus: offersTable.status,
      offerMessage: offersTable.message,
      offeredCash: offersTable.offeredCash,
      offeredCredit: offersTable.offeredCredit,
    })
    .from(dealsTable)
    .leftJoin(itemsTable, eq(dealsTable.targetItemId, itemsTable.id))
    .leftJoin(offersTable, eq(dealsTable.offerId, offersTable.id))
    .where(eq(dealsTable.id, dealId));

  if (!row) {
    res.status(404).json({ error: "ไม่พบดีล" });
    return;
  }

  if (row.deal.senderId !== uid && row.deal.receiverId !== uid) {
    res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงดีลนี้" });
    return;
  }

  res.json({
    deal: {
      ...row.deal,
      item: { title: row.itemTitle },
      offer: {
        status: row.offerStatus,
        message: row.offerMessage,
        offeredCash: row.offeredCash,
        offeredCredit: row.offeredCredit,
      },
    },
  });
});

router.patch(
  "/deals/:id/stage",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const uid = req.user.id;
    const dealId = String(req.params.id);

    const parsed = updateDealStageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "stage ไม่ถูกต้อง" });
      return;
    }

    const [deal] = await db
      .select()
      .from(dealsTable)
      .where(eq(dealsTable.id, dealId));

    if (!deal) {
      res.status(404).json({ error: "ไม่พบดีล" });
      return;
    }

    if (deal.senderId !== uid && deal.receiverId !== uid) {
      res.status(403).json({ error: "ไม่มีสิทธิ์อัปเดตดีลนี้" });
      return;
    }

    if (!isDealStage(deal.stage)) {
      res.status(409).json({ error: "สถานะดีลปัจจุบันไม่รองรับการเปลี่ยนขั้น" });
      return;
    }

    const nextStage = parsed.data.stage;
    if (!allowedTransitions[deal.stage].includes(nextStage)) {
      res.status(409).json({ error: "เปลี่ยนขั้นดีลไม่ถูกต้อง" });
      return;
    }

    const [updated] = await db
      .update(dealsTable)
      .set({
        stage: nextStage,
        logisticsConfirmed:
          nextStage === "shipped_or_pickup_set" || nextStage === "received"
            ? true
            : deal.logisticsConfirmed,
      })
      .where(eq(dealsTable.id, deal.id))
      .returning();

    if (nextStage === "canceled") {
      await db
        .update(offersTable)
        .set({ status: "canceled" })
        .where(
          and(eq(offersTable.id, deal.offerId), eq(offersTable.status, "accepted")),
        );
    }

    res.json({ deal: updated });
  },
);

export default router;
