import { Router, type IRouter, type Request, type Response } from "express";
import {
  conversationsTable,
  db,
  dealsTable,
  insertOfferSchema,
  itemsTable,
  offersTable,
} from "@workspace/db";
import { and, desc, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();
const offerIdParamSchema = z.object({
  id: z.uuid(),
});

const ACTIVE_OFFER_STATUSES = ["pending"] as const;
const OFFER_TRANSITIONS = {
  pending: ["accepted", "rejected", "canceled"],
  accepted: [],
  rejected: [],
  canceled: [],
} as const;

type OfferListScope = "mine" | "sent" | "received";
type OfferUpdateStatus = "accepted" | "rejected" | "canceled";

async function listOffersForUser(userId: string, scope: OfferListScope) {
  const whereClause =
    scope === "sent"
      ? eq(offersTable.senderId, userId)
      : scope === "received"
        ? eq(offersTable.receiverId, userId)
        : or(eq(offersTable.senderId, userId), eq(offersTable.receiverId, userId));

  const rows = await db
    .select({
      offer: offersTable,
      itemId: itemsTable.id,
      itemOwnerId: itemsTable.ownerId,
      itemTitle: itemsTable.title,
      itemStatus: itemsTable.status,
      dealId: dealsTable.id,
      dealStage: dealsTable.stage,
      dealFulfillmentType: dealsTable.fulfillmentType,
      dealLogisticsConfirmed: dealsTable.logisticsConfirmed,
    })
    .from(offersTable)
    .leftJoin(itemsTable, eq(offersTable.targetItemId, itemsTable.id))
    .leftJoin(dealsTable, eq(dealsTable.offerId, offersTable.id))
    .where(whereClause)
    .orderBy(desc(offersTable.createdAt));

  return rows.map((row) => ({
    ...row.offer,
    item: row.itemId
      ? {
          id: row.itemId,
          ownerId: row.itemOwnerId,
          title: row.itemTitle,
          status: row.itemStatus,
        }
      : null,
    deal: row.dealId
      ? {
          id: row.dealId,
          stage: row.dealStage,
          fulfillmentType: row.dealFulfillmentType,
          logisticsConfirmed: row.dealLogisticsConfirmed,
        }
      : null,
  }));
}

async function sendOfferList(
  req: Request,
  res: Response,
  scope: OfferListScope,
) {
  if (!req.isAuthenticated()) return;
  const offers = await listOffersForUser(req.user.id, scope);
  res.json({ offers });
}

router.get("/offers", requireAuth, async (req: Request, res: Response) => {
  await sendOfferList(req, res, "mine");
});

router.get("/offers/mine", requireAuth, async (req: Request, res: Response) => {
  await sendOfferList(req, res, "mine");
});

router.get("/offers/sent", requireAuth, async (req: Request, res: Response) => {
  await sendOfferList(req, res, "sent");
});

router.get(
  "/offers/received",
  requireAuth,
  async (req: Request, res: Response) => {
    await sendOfferList(req, res, "received");
  },
);

const createOfferSchema = insertOfferSchema.pick({
  targetItemId: true,
  message: true,
  offeredCash: true,
  offeredCredit: true,
});
const offerTargetItemIdSchema = z.uuid();

router.post("/offers", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = createOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลข้อเสนอไม่ครบ", parsed.error);
    return;
  }
  const itemIdParsed = offerTargetItemIdSchema.safeParse(parsed.data.targetItemId);
  if (!itemIdParsed.success) {
    sendValidationError(res, "รหัสสินค้าที่อ้างอิงไม่ถูกต้อง", itemIdParsed.error);
    return;
  }
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, itemIdParsed.data));
  if (!item) {
    sendError(res, 404, "not_found", "ไม่พบสินค้า");
    return;
  }
  if (item.ownerId === req.user.id) {
    sendError(res, 400, "invalid_state", "ไม่สามารถขอแลกสินค้าของตัวเอง");
    return;
  }
  if (item.status !== "active") {
    sendError(res, 409, "invalid_state", "ไม่สามารถส่งข้อเสนอให้สินค้าที่ไม่พร้อมแลก");
    return;
  }
  const [existingActiveOffer] = await db
    .select()
    .from(offersTable)
    .where(
      and(
        eq(offersTable.targetItemId, item.id),
        eq(offersTable.senderId, req.user.id),
        eq(offersTable.receiverId, item.ownerId),
        eq(offersTable.status, ACTIVE_OFFER_STATUSES[0]),
      ),
    );
  if (existingActiveOffer) {
    sendError(
      res,
      409,
      "conflict",
      "คุณมีข้อเสนอที่รอดำเนินการสำหรับสินค้านี้อยู่แล้ว",
    );
    return;
  }
  const [created] = await db
    .insert(offersTable)
    .values({
      targetItemId: itemIdParsed.data,
      senderId: req.user.id,
      receiverId: item.ownerId,
      message: parsed.data.message ?? "",
      offeredCash: parsed.data.offeredCash ?? 0,
      offeredCredit: parsed.data.offeredCredit ?? 0,
    })
    .returning();
  res.status(201).json({ offer: created });
});

const patchSchema = z.object({
  status: z.enum(["accepted", "rejected", "canceled"]),
});

function canTransitionOffer(
  currentStatus: keyof typeof OFFER_TRANSITIONS,
  nextStatus: OfferUpdateStatus,
) {
  const allowedTransitions = OFFER_TRANSITIONS[
    currentStatus
  ] as readonly OfferUpdateStatus[];
  return allowedTransitions.includes(nextStatus);
}

router.patch(
  "/offers/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const paramsParsed = offerIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", paramsParsed.error);
      return;
    }
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "status ไม่ถูกต้อง", parsed.error);
      return;
    }
    const [offer] = await db
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, paramsParsed.data.id));
    if (!offer) {
      sendError(res, 404, "not_found", "ไม่พบข้อเสนอ");
      return;
    }
    const [item] = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, offer.targetItemId));
    if (!item) {
      sendError(res, 404, "not_found", "ไม่พบสินค้า");
      return;
    }
    const isReceiver = offer.receiverId === req.user.id;
    const isSender = offer.senderId === req.user.id;
    if (parsed.data.status === "canceled" && !isSender) {
      sendError(res, 403, "forbidden", "เฉพาะผู้ส่งเท่านั้นที่ยกเลิกได้");
      return;
    }
    if (parsed.data.status !== "canceled" && !isReceiver) {
      sendError(res, 403, "forbidden", "เฉพาะผู้รับข้อเสนอเท่านั้นที่ตอบได้");
      return;
    }
    if (!canTransitionOffer(offer.status, parsed.data.status)) {
      sendError(
        res,
        409,
        "invalid_state",
        "สถานะข้อเสนอไม่สามารถเปลี่ยนไปสถานะที่ต้องการได้",
      );
      return;
    }
    if (parsed.data.status === "accepted" && item.status !== "active") {
      sendError(
        res,
        409,
        "invalid_state",
        "ไม่สามารถตอบรับข้อเสนอของสินค้าที่ไม่พร้อมแลก",
      );
      return;
    }

    const updated = await db.transaction(async (tx) => {
      const [nextOffer] = await tx
        .update(offersTable)
        .set({ status: parsed.data.status })
        .where(
          and(
            eq(offersTable.id, offer.id),
            eq(offersTable.status, offer.status),
          ),
        )
        .returning();

      if (!nextOffer) {
        return null;
      }

      if (parsed.data.status === "accepted") {
        const updatedDeals = await tx
          .update(dealsTable)
          .set({
            senderId: offer.senderId,
            receiverId: offer.receiverId,
            targetItemId: offer.targetItemId,
            stage: "accepted",
          })
          .where(eq(dealsTable.offerId, offer.id))
          .returning();

        const [deal] =
          updatedDeals.length > 0
            ? updatedDeals
            : await tx
                .insert(dealsTable)
                .values({
                  offerId: offer.id,
                  senderId: offer.senderId,
                  receiverId: offer.receiverId,
                  targetItemId: offer.targetItemId,
                  stage: "accepted",
                })
                .returning();

        const [participantAId, participantBId] = [
          offer.senderId,
          offer.receiverId,
        ].sort();

        const [existingConversation] = await tx
          .select()
          .from(conversationsTable)
          .where(eq(conversationsTable.dealId, deal.id));

        if (!existingConversation) {
          await tx.insert(conversationsTable).values({
            dealId: deal.id,
            participantAId,
            participantBId,
            lastMessage: "",
          });
        }
      }

      return nextOffer;
    });

    if (!updated) {
      sendError(
        res,
        409,
        "conflict",
        "ข้อเสนอนี้ถูกอัปเดตไปแล้ว กรุณารีเฟรชแล้วลองใหม่",
      );
      return;
    }

    res.json({ offer: updated });
  },
);

export default router;
