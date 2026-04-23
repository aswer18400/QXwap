import { Router, type IRouter, type Request, type Response } from "express";
import {
  conversationsTable,
  db,
  dealsTable,
  insertOfferSchema,
  itemsTable,
  notificationsTable,
  offersTable,
} from "@workspace/db";
import { and, desc, eq, ne, notInArray, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();
const offerIdParamSchema = z.object({
  id: z.uuid(),
});

const ACTIVE_OFFER_STATUSES = ["pending", "accepted"] as const;
const BLOCKING_DEAL_STAGES = [
  "accepted",
  "logistics_pending",
  "logistics_confirmed",
  "shipped_or_pickup_set",
  "in_transit",
  "received",
] as const;
const OFFER_TRANSITIONS = {
  pending: ["accepted", "rejected", "canceled"],
  accepted: [],
  rejected: [],
  canceled: [],
} as const;

type OfferListScope = "mine" | "sent" | "received";
type OfferUpdateStatus = "accepted" | "rejected" | "canceled";
type OfferRow = typeof offersTable.$inferSelect;
type ItemRow = typeof itemsTable.$inferSelect;

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

async function hasDuplicateActiveOffer(
  offer: Pick<OfferRow, "id" | "targetItemId" | "senderId" | "receiverId">,
) {
  const [existingActiveOffer] = await db
    .select({ id: offersTable.id })
    .from(offersTable)
    .where(
      and(
        eq(offersTable.targetItemId, offer.targetItemId),
        eq(offersTable.senderId, offer.senderId),
        eq(offersTable.receiverId, offer.receiverId),
        or(
          eq(offersTable.status, ACTIVE_OFFER_STATUSES[0]),
          eq(offersTable.status, ACTIVE_OFFER_STATUSES[1]),
        ),
        ne(offersTable.id, offer.id),
      ),
    );

  return Boolean(existingActiveOffer);
}

async function hasBlockingDealForItem(targetItemId: string, excludedOfferId?: string) {
  const clauses = [
    eq(dealsTable.targetItemId, targetItemId),
    notInArray(dealsTable.stage, ["completed", "canceled"]),
  ];
  if (excludedOfferId) {
    clauses.push(ne(dealsTable.offerId, excludedOfferId));
  }

  const [blockingDeal] = await db
    .select({ id: dealsTable.id })
    .from(dealsTable)
    .where(and(...clauses));

  return Boolean(blockingDeal);
}

function validateCreateOfferBusinessRules(item: ItemRow, userId: string) {
  if (item.ownerId === userId) {
    return { status: 400 as const, code: "invalid_state", message: "ไม่สามารถขอแลกสินค้าของตัวเอง" };
  }
  if (item.status !== "active") {
    return {
      status: 409 as const,
      code: "invalid_state",
      message: "ไม่สามารถส่งข้อเสนอให้สินค้าที่ไม่พร้อมแลก",
    };
  }
  return null;
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

  const created = await db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, itemIdParsed.data));

    if (!item) {
      return { error: { status: 404 as const, code: "not_found", message: "ไม่พบสินค้า" } };
    }

    const businessError = validateCreateOfferBusinessRules(item, req.user.id);
    if (businessError) return { error: businessError };

    const [existingActiveOffer] = await tx
      .select({ id: offersTable.id })
      .from(offersTable)
      .where(
        and(
          eq(offersTable.targetItemId, item.id),
          eq(offersTable.senderId, req.user.id),
          eq(offersTable.receiverId, item.ownerId),
          or(
            eq(offersTable.status, ACTIVE_OFFER_STATUSES[0]),
            eq(offersTable.status, ACTIVE_OFFER_STATUSES[1]),
          ),
        ),
      );

    if (existingActiveOffer) {
      return {
        error: {
          status: 409 as const,
          code: "conflict",
          message: "คุณมีข้อเสนอที่ยัง active สำหรับสินค้านี้อยู่แล้ว",
        },
      };
    }

    const [blockingDeal] = await tx
      .select({ id: dealsTable.id })
      .from(dealsTable)
      .where(
        and(
          eq(dealsTable.targetItemId, item.id),
          notInArray(dealsTable.stage, ["completed", "canceled"]),
        ),
      );

    if (blockingDeal) {
      return {
        error: {
          status: 409 as const,
          code: "invalid_state",
          message: "สินค้านี้มีดีลที่กำลังดำเนินการอยู่แล้ว",
        },
      };
    }

    const [offer] = await tx
      .insert(offersTable)
      .values({
        targetItemId: item.id,
        senderId: req.user.id,
        receiverId: item.ownerId,
        message: parsed.data.message ?? "",
        offeredCash: parsed.data.offeredCash ?? 0,
        offeredCredit: parsed.data.offeredCredit ?? 0,
      })
      .returning();

    await tx.insert(notificationsTable).values({
      userId: item.ownerId,
      actorId: req.user.id,
      type: "offer_received",
      title: "คุณได้รับข้อเสนอใหม่",
      body: item.title,
      offerId: offer.id,
    });

    return { offer };
  });

  if ("error" in created) {
    sendError(res, created.error.status, created.error.code, created.error.message);
    return;
  }

  res.status(201).json({ offer: created.offer });
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

    const result = await db.transaction(async (tx) => {
      const [offer] = await tx
        .select()
        .from(offersTable)
        .where(eq(offersTable.id, paramsParsed.data.id));
      if (!offer) {
        return { error: { status: 404 as const, code: "not_found", message: "ไม่พบข้อเสนอ" } };
      }

      const [item] = await tx
        .select()
        .from(itemsTable)
        .where(eq(itemsTable.id, offer.targetItemId));
      if (!item) {
        return { error: { status: 404 as const, code: "not_found", message: "ไม่พบสินค้า" } };
      }

      const isReceiver = offer.receiverId === req.user.id;
      const isSender = offer.senderId === req.user.id;
      if (parsed.data.status === "canceled" && !isSender) {
        return {
          error: {
            status: 403 as const,
            code: "forbidden",
            message: "เฉพาะผู้ส่งเท่านั้นที่ยกเลิกได้",
          },
        };
      }
      if (parsed.data.status !== "canceled" && !isReceiver) {
        return {
          error: {
            status: 403 as const,
            code: "forbidden",
            message: "เฉพาะผู้รับข้อเสนอเท่านั้นที่ตอบได้",
          },
        };
      }
      if (!canTransitionOffer(offer.status, parsed.data.status)) {
        return {
          error: {
            status: 409 as const,
            code: "invalid_state",
            message: "สถานะข้อเสนอไม่สามารถเปลี่ยนไปสถานะที่ต้องการได้",
          },
        };
      }
      if (parsed.data.status === "accepted" && item.status !== "active") {
        return {
          error: {
            status: 409 as const,
            code: "invalid_state",
            message: "ไม่สามารถตอบรับข้อเสนอของสินค้าที่ไม่พร้อมแลก",
          },
        };
      }

      if (parsed.data.status === "accepted") {
        const [acceptedOfferOnSameItem] = await tx
          .select({ id: offersTable.id })
          .from(offersTable)
          .where(
            and(
              eq(offersTable.targetItemId, offer.targetItemId),
              eq(offersTable.status, "accepted"),
              ne(offersTable.id, offer.id),
            ),
          );

        if (acceptedOfferOnSameItem) {
          return {
            error: {
              status: 409 as const,
              code: "invalid_state",
              message: "สินค้านี้มีข้อเสนอที่ถูกตอบรับไปแล้ว",
            },
          };
        }

        const [blockingDeal] = await tx
          .select({ id: dealsTable.id })
          .from(dealsTable)
          .where(
            and(
              eq(dealsTable.targetItemId, offer.targetItemId),
              notInArray(dealsTable.stage, ["completed", "canceled"]),
              ne(dealsTable.offerId, offer.id),
            ),
          );

        if (blockingDeal) {
          return {
            error: {
              status: 409 as const,
              code: "invalid_state",
              message: "สินค้านี้มีดีลอื่นกำลังดำเนินการอยู่แล้ว",
            },
          };
        }
      }

      const [nextOffer] = await tx
        .update(offersTable)
        .set({ status: parsed.data.status })
        .where(and(eq(offersTable.id, offer.id), eq(offersTable.status, offer.status)))
        .returning();

      if (!nextOffer) {
        return {
          error: {
            status: 409 as const,
            code: "conflict",
            message: "ข้อเสนอนี้ถูกอัปเดตไปแล้ว กรุณารีเฟรชแล้วลองใหม่",
          },
        };
      }

      let nextDeal: typeof dealsTable.$inferSelect | null = null;

      if (parsed.data.status === "accepted") {
        const [existingDeal] = await tx
          .select()
          .from(dealsTable)
          .where(eq(dealsTable.offerId, offer.id));

        if (existingDeal) {
          const [updatedDeal] = await tx
            .update(dealsTable)
            .set({
              senderId: offer.senderId,
              receiverId: offer.receiverId,
              targetItemId: offer.targetItemId,
              stage: BLOCKING_DEAL_STAGES.includes(existingDeal.stage as (typeof BLOCKING_DEAL_STAGES)[number])
                ? existingDeal.stage
                : "accepted",
            })
            .where(eq(dealsTable.id, existingDeal.id))
            .returning();
          nextDeal = updatedDeal ?? null;
        } else {
          const [createdDeal] = await tx
            .insert(dealsTable)
            .values({
              offerId: offer.id,
              senderId: offer.senderId,
              receiverId: offer.receiverId,
              targetItemId: offer.targetItemId,
              stage: "accepted",
            })
            .returning();
          nextDeal = createdDeal ?? null;
        }

        if (!nextDeal) {
          return {
            error: {
              status: 500 as const,
              code: "deal_sync_failed",
              message: "ไม่สามารถสร้างหรืออัปเดตดีลที่เกี่ยวข้องได้",
            },
          };
        }

        const [participantAId, participantBId] = [offer.senderId, offer.receiverId].sort();

        const [existingConversation] = await tx
          .select()
          .from(conversationsTable)
          .where(eq(conversationsTable.dealId, nextDeal.id));

        if (!existingConversation) {
          await tx.insert(conversationsTable).values({
            dealId: nextDeal.id,
            participantAId,
            participantBId,
            lastMessage: "",
          });
        }

        await tx.insert(notificationsTable).values({
          userId: offer.senderId,
          actorId: req.user.id,
          type: "offer_accepted",
          title: "ข้อเสนอของคุณถูกตอบรับ",
          offerId: offer.id,
          dealId: nextDeal.id,
        });
      }

      if (parsed.data.status === "rejected") {
        await tx.insert(notificationsTable).values({
          userId: offer.senderId,
          actorId: req.user.id,
          type: "offer_rejected",
          title: "ข้อเสนอของคุณถูกปฏิเสธ",
          offerId: offer.id,
        });
      }

      return { offer: nextOffer, deal: nextDeal };
    });

    if ("error" in result) {
      sendError(res, result.error.status, result.error.code, result.error.message);
      return;
    }

    res.json({ offer: result.offer, deal: result.deal });
  },
);

export default router;
