import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  dealsTable,
  itemsTable,
  offersTable,
  dealFulfillmentTypeSchema,
} from "@workspace/db";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

const dealStages = [
  "accepted",
  "logistics_pending",
  "logistics_confirmed",
  "shipped_or_pickup_set",
  "in_transit",
  "received",
  "completed",
  "canceled",
] as const;

type DealStage = (typeof dealStages)[number];
type DealLogisticsPatch = z.infer<typeof patchLogisticsSchema>;
type DealRow = typeof dealsTable.$inferSelect;

const patchLogisticsSchema = z
  .object({
    fulfillmentType: dealFulfillmentTypeSchema.optional(),
    pickupSlot: z.string().trim().min(1).max(120).nullable().optional(),
    pickupPoint: z.string().trim().min(1).max(2000).nullable().optional(),
    shippingAddress: z.string().trim().min(1).max(4000).nullable().optional(),
    carrier: z.string().trim().min(1).max(120).nullable().optional(),
    trackingCode: z.string().trim().min(1).max(120).nullable().optional(),
    shipmentProofRef: z.string().trim().min(1).max(2000).nullable().optional(),
    receiptProofRef: z.string().trim().min(1).max(2000).nullable().optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "ต้องส่งข้อมูล logistics อย่างน้อย 1 ช่อง",
  });

const updateDealStageSchema = z.object({
  stage: z.enum(dealStages),
});

const allowedTransitions: Record<DealStage, readonly DealStage[]> = {
  accepted: ["logistics_pending", "logistics_confirmed", "shipped_or_pickup_set", "canceled"],
  logistics_pending: ["logistics_confirmed", "shipped_or_pickup_set", "canceled"],
  logistics_confirmed: ["shipped_or_pickup_set", "in_transit", "received", "canceled"],
  shipped_or_pickup_set: ["in_transit", "received", "canceled"],
  in_transit: ["received", "completed", "canceled"],
  received: ["completed"],
  completed: [],
  canceled: [],
};

function isDealStage(stage: string): stage is DealStage {
  return dealStages.includes(stage as DealStage);
}

function isDealParticipant(deal: DealRow, userId: string) {
  return deal.senderId === userId || deal.receiverId === userId;
}

function hasField(payload: DealLogisticsPatch, field: keyof DealLogisticsPatch) {
  return Object.prototype.hasOwnProperty.call(payload, field);
}

function ensureLogisticsWritePermission(
  deal: DealRow,
  payload: DealLogisticsPatch,
  userId: string,
): string | null {
  const isOwner = deal.receiverId === userId;
  const isReceiver = deal.senderId === userId;
  const ownerOnlyFields: Array<keyof DealLogisticsPatch> = [
    "fulfillmentType",
    "pickupSlot",
    "pickupPoint",
    "carrier",
    "trackingCode",
    "shipmentProofRef",
  ];
  const receiverOnlyFields: Array<keyof DealLogisticsPatch> = [
    "shippingAddress",
    "receiptProofRef",
  ];

  for (const field of ownerOnlyFields) {
    if (hasField(payload, field) && !isOwner) {
      return "สิทธิ์ไม่พอ: เฉพาะเจ้าของดีลเท่านั้นที่อัปเดตข้อมูลส่วนนี้ได้";
    }
  }
  for (const field of receiverOnlyFields) {
    if (hasField(payload, field) && !isReceiver) {
      return "สิทธิ์ไม่พอ: เฉพาะผู้รับของเท่านั้นที่อัปเดตข้อมูลส่วนนี้ได้";
    }
  }
  return null;
}

function computeDerivedLogistics(next: DealRow) {
  const hasPickupLogistics = Boolean(next.pickupSlot && next.pickupPoint);
  const hasShippingLogistics = Boolean(
    next.shippingAddress && next.carrier && next.trackingCode,
  );
  const hasAnyLogisticsData = Boolean(
    next.pickupSlot ||
      next.pickupPoint ||
      next.shippingAddress ||
      next.carrier ||
      next.trackingCode,
  );
  const logisticsConfirmed =
    next.fulfillmentType === "pickup" ? hasPickupLogistics : hasShippingLogistics;

  let stage: DealStage = "accepted";
  if (hasAnyLogisticsData && !logisticsConfirmed) stage = "logistics_pending";
  if (logisticsConfirmed) stage = "logistics_confirmed";
  if (next.shipmentProofRef) stage = "in_transit";
  if (next.receiptProofRef) stage = "completed";

  return { stage, logisticsConfirmed };
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
      role: row.deal.receiverId === uid ? ("owner" as const) : ("receiver" as const),
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
  if (!isDealParticipant(row.deal, uid)) {
    res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงดีลนี้" });
    return;
  }

  res.json({
    deal: {
      ...row.deal,
      role: row.deal.receiverId === uid ? ("owner" as const) : ("receiver" as const),
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
    if (!isDealParticipant(deal, uid)) {
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
          nextStage === "shipped_or_pickup_set" ||
          nextStage === "in_transit" ||
          nextStage === "received" ||
          nextStage === "completed"
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

router.patch(
  "/deals/:id/logistics",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const uid = req.user.id;
    const dealId = String(req.params.id);

    const parsed = patchLogisticsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ข้อมูล logistics ไม่ถูกต้อง" });
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
    if (!isDealParticipant(deal, uid)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์อัปเดตดีลนี้" });
      return;
    }

    const permissionErr = ensureLogisticsWritePermission(deal, parsed.data, uid);
    if (permissionErr) {
      res.status(403).json({ error: permissionErr });
      return;
    }

    const payload = parsed.data;
    const rawUpdates: Partial<typeof dealsTable.$inferInsert> = {};
    if (payload.fulfillmentType !== undefined) {
      rawUpdates.fulfillmentType = payload.fulfillmentType;
    }
    if (payload.pickupSlot !== undefined) {
      rawUpdates.pickupSlot = payload.pickupSlot?.trim() ?? null;
    }
    if (payload.pickupPoint !== undefined) {
      rawUpdates.pickupPoint = payload.pickupPoint?.trim() ?? null;
    }
    if (payload.shippingAddress !== undefined) {
      rawUpdates.shippingAddress = payload.shippingAddress?.trim() ?? null;
    }
    if (payload.carrier !== undefined) {
      rawUpdates.carrier = payload.carrier?.trim() ?? null;
    }
    if (payload.trackingCode !== undefined) {
      rawUpdates.trackingCode = payload.trackingCode?.trim() ?? null;
    }
    if (payload.shipmentProofRef !== undefined) {
      rawUpdates.shipmentProofRef = payload.shipmentProofRef?.trim() ?? null;
    }
    if (payload.receiptProofRef !== undefined) {
      rawUpdates.receiptProofRef = payload.receiptProofRef?.trim() ?? null;
    }

    const nextDeal: DealRow = {
      ...deal,
      ...rawUpdates,
    };
    const derived = computeDerivedLogistics(nextDeal);

    const [updated] = await db
      .update(dealsTable)
      .set({
        ...rawUpdates,
        stage: derived.stage,
        logisticsConfirmed: derived.logisticsConfirmed,
      })
      .where(
        and(
          eq(dealsTable.id, deal.id),
          or(eq(dealsTable.senderId, uid), eq(dealsTable.receiverId, uid)),
        ),
      )
      .returning();

    res.json({ deal: updated });
  },
);

export default router;
