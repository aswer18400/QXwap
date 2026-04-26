import {
  db,
  itemsTable,
  offerChatsTable,
  offerConfirmationsTable,
  offerItemsTable,
  offersTable,
  shipmentsTable,
} from "@workspace/db";
import { and, count, desc, eq, or, sql } from "drizzle-orm";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import * as WalletService from "./wallet.service";
import * as NotificationService from "./notification.service";
import * as ProductService from "./product.service";

type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Input types ─────────────────────────────────────────────

export interface OfferItemInput {
  productId?: string;
  cashAmount?: number;
  creditAmount?: number;
}

export interface CreateOfferInput {
  targetItemId: string;
  message?: string;
  items: OfferItemInput[];
}

// ─── Queries ─────────────────────────────────────────────────

export async function getOffer(offerId: string, requesterId: string) {
  const [offer] = await db
    .select()
    .from(offersTable)
    .where(eq(offersTable.id, offerId));

  if (!offer) throw new AppError(404, "not_found", "ไม่พบข้อเสนอ");
  if (offer.senderId !== requesterId && offer.receiverId !== requesterId) {
    throw new AppError(403, "forbidden", "ไม่มีสิทธิ์เข้าถึงข้อเสนอนี้");
  }

  const items = await db
    .select()
    .from(offerItemsTable)
    .where(eq(offerItemsTable.offerId, offerId));

  const confirmations = await db
    .select()
    .from(offerConfirmationsTable)
    .where(eq(offerConfirmationsTable.offerId, offerId));

  return { ...offer, items, confirmations };
}

export async function listOffers(
  userId: string,
  scope: "mine" | "sent" | "received",
) {
  const where =
    scope === "sent"
      ? eq(offersTable.senderId, userId)
      : scope === "received"
        ? eq(offersTable.receiverId, userId)
        : or(
            eq(offersTable.senderId, userId),
            eq(offersTable.receiverId, userId),
          );

  return db
    .select({
      offer: offersTable,
      targetItemTitle: itemsTable.title,
      targetItemStatus: itemsTable.status,
      targetItemImageEmoji: itemsTable.imageEmoji,
    })
    .from(offersTable)
    .leftJoin(itemsTable, eq(offersTable.targetItemId, itemsTable.id))
    .where(where)
    .orderBy(desc(offersTable.createdAt));
}

// ─── Create ───────────────────────────────────────────────────

export async function createOffer(fromUserId: string, input: CreateOfferInput) {
  return db.transaction(async (tx) => {
    // 1. Validate target item — FOR UPDATE serialises concurrent offers on the
    //    same item from the same sender, so the duplicate-pending check below
    //    always sees a consistent view.
    const [targetItem] = await tx
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.targetItemId))
      .for("update");

    if (!targetItem) throw new AppError(404, "not_found", "ไม่พบสินค้า");
    if (targetItem.ownerId === fromUserId) {
      throw new AppError(400, "invalid_state", "ไม่สามารถขอแลกสินค้าของตัวเอง");
    }
    if (targetItem.status === "locked") {
      throw new AppError(409, "product_locked", "สินค้านี้กำลังอยู่ในระหว่างการแลกเปลี่ยนอื่น");
    }
    if (targetItem.status === "traded") {
      throw new AppError(409, "product_traded", "สินค้านี้ถูกแลกเปลี่ยนไปแล้ว");
    }
    if (targetItem.status !== "active") {
      throw new AppError(409, "invalid_state", "สินค้าไม่พร้อมรับข้อเสนอ");
    }

    // 2. No duplicate pending offer from same sender
    const [duplicate] = await tx
      .select({ id: offersTable.id })
      .from(offersTable)
      .where(
        and(
          eq(offersTable.targetItemId, input.targetItemId),
          eq(offersTable.senderId, fromUserId),
          eq(offersTable.status, "pending"),
        ),
      );
    if (duplicate) {
      throw new AppError(
        409,
        "conflict",
        "มีข้อเสนอที่รอดำเนินการสำหรับสินค้านี้อยู่แล้ว",
      );
    }

    // 3. Validate all offered products: owned by sender, not locked, not traded
    const offeredProductIds = input.items
      .filter((i) => i.productId)
      .map((i) => i.productId as string);

    await ProductService.validateProductsAvailable(tx, offeredProductIds, fromUserId);

    // 4. Aggregate totals for denormalised columns + wallet lock
    const totalCash = input.items.reduce(
      (s, i) => s + (i.cashAmount ?? 0),
      0,
    );
    const totalCredit = input.items.reduce(
      (s, i) => s + (i.creditAmount ?? 0),
      0,
    );

    // 5. Ensure sender wallet exists (balance check happens in lockFunds)
    await WalletService.getOrCreateWallet(tx, fromUserId);

    // 6. Insert offer first to get a real ID
    const [offer] = await tx
      .insert(offersTable)
      .values({
        targetItemId: input.targetItemId,
        senderId: fromUserId,
        receiverId: targetItem.ownerId,
        message: input.message ?? "",
        offeredCash: String(totalCash),
        offeredCredit: String(totalCredit),
        status: "pending",
      })
      .returning();

    // 7. Lock funds using the real offerId
    await WalletService.lockFunds(tx, {
      userId: fromUserId,
      offerId: offer.id,
      cashAmount: totalCash,
      creditAmount: totalCredit,
    });

    // 8. Insert offer_items
    for (const item of input.items) {
      await tx.insert(offerItemsTable).values({
        offerId: offer.id,
        productId: item.productId ?? null,
        cashAmount: String(item.cashAmount ?? 0),
        creditAmount: String(item.creditAmount ?? 0),
      });
    }

    // 9. Lock offered products (batch update)
    await ProductService.lockProducts(tx, offeredProductIds);

    // 10. Auto-create chat room
    await tx.insert(offerChatsTable).values({ offerId: offer.id });

    // 11. Notify receiver
    await NotificationService.notify(tx, {
      userId: targetItem.ownerId,
      actorId: fromUserId,
      type: "offer_received",
      offerId: offer.id,
      title: "คุณได้รับข้อเสนอใหม่",
      body: targetItem.title,
    });

    logger.info(
      { offerId: offer.id, senderId: fromUserId, receiverId: targetItem.ownerId },
      "offer.created",
    );
    return offer;
  });
}

// ─── Accept ──────────────────────────────────────────────────

export async function acceptOffer(offerId: string, userId: string) {
  return db.transaction(async (tx) => {
    const offer = await lockOffer(tx, offerId);

    if (offer.receiverId !== userId) {
      throw new AppError(403, "forbidden", "เฉพาะผู้รับข้อเสนอเท่านั้นที่ตอบรับได้");
    }
    assertTransition(offer.status, "accepted");

    const [updated] = await tx
      .update(offersTable)
      .set({ status: "accepted" })
      .where(and(eq(offersTable.id, offerId), eq(offersTable.status, "pending")))
      .returning();

    if (!updated) {
      throw new AppError(
        409,
        "conflict",
        "ข้อเสนอถูกอัปเดตก่อนหน้านี้แล้ว กรุณารีเฟรช",
      );
    }

    // Lock target item so it cannot receive new offers while deal is active
    await ProductService.lockProducts(tx, [offer.targetItemId]);

    await NotificationService.notify(tx, {
      userId: offer.senderId,
      actorId: userId,
      type: "offer_accepted",
      offerId,
      title: "ข้อเสนอของคุณถูกตอบรับ",
    });

    logger.info({ offerId, userId }, "offer.accepted");
    return updated;
  });
}

// ─── Reject ──────────────────────────────────────────────────

export async function rejectOffer(offerId: string, userId: string) {
  return db.transaction(async (tx) => {
    const offer = await lockOffer(tx, offerId);

    if (offer.receiverId !== userId) {
      throw new AppError(403, "forbidden", "เฉพาะผู้รับข้อเสนอเท่านั้นที่ปฏิเสธได้");
    }
    assertTransition(offer.status, "rejected");

    const [updated] = await tx
      .update(offersTable)
      .set({ status: "rejected" })
      .where(and(eq(offersTable.id, offerId), eq(offersTable.status, offer.status)))
      .returning();

    if (!updated) {
      throw new AppError(409, "conflict", "ข้อเสนอถูกอัปเดตก่อนหน้านี้แล้ว กรุณารีเฟรช");
    }

    await unlockOfferAssets(tx, offer);

    await NotificationService.notify(tx, {
      userId: offer.senderId,
      actorId: userId,
      type: "offer_rejected",
      offerId,
      title: "ข้อเสนอของคุณถูกปฏิเสธ",
    });

    logger.info({ offerId, userId }, "offer.rejected");
    return updated;
  });
}

// ─── Cancel ──────────────────────────────────────────────────

export async function cancelOffer(offerId: string, userId: string) {
  return db.transaction(async (tx) => {
    const offer = await lockOffer(tx, offerId);

    if (offer.senderId !== userId) {
      throw new AppError(403, "forbidden", "เฉพาะผู้ส่งข้อเสนอเท่านั้นที่ยกเลิกได้");
    }
    assertTransition(offer.status, "canceled");

    const [updated] = await tx
      .update(offersTable)
      .set({ status: "canceled" })
      .where(and(eq(offersTable.id, offerId), eq(offersTable.status, offer.status)))
      .returning();

    if (!updated) {
      throw new AppError(409, "conflict", "ข้อเสนอถูกอัปเดตก่อนหน้านี้แล้ว กรุณารีเฟรช");
    }

    await unlockOfferAssets(tx, offer);

    await NotificationService.notify(tx, {
      userId: offer.receiverId,
      actorId: userId,
      type: "offer_cancelled",
      offerId,
      title: "ข้อเสนอถูกยกเลิก",
    });

    logger.info({ offerId, userId }, "offer.cancelled");
    return updated;
  });
}

// ─── Confirm ─────────────────────────────────────────────────

export async function confirmOffer(offerId: string, userId: string) {
  return db.transaction(async (tx) => {
    const offer = await lockOffer(tx, offerId);

    if (offer.senderId !== userId && offer.receiverId !== userId) {
      throw new AppError(403, "forbidden", "ไม่มีสิทธิ์ยืนยันข้อเสนอนี้");
    }
    if (offer.status !== "accepted") {
      throw new AppError(
        409,
        "invalid_state",
        "ยืนยันได้เฉพาะข้อเสนอที่ถูกตอบรับแล้ว",
      );
    }

    // Insert confirmation — UNIQUE constraint prevents double-confirm
    await tx
      .insert(offerConfirmationsTable)
      .values({ offerId, userId })
      .onConflictDoNothing();

    const [{ total }] = await tx
      .select({ total: count() })
      .from(offerConfirmationsTable)
      .where(eq(offerConfirmationsTable.offerId, offerId));

    const otherParty =
      userId === offer.senderId ? offer.receiverId : offer.senderId;

    await NotificationService.notify(tx, {
      userId: otherParty,
      actorId: userId,
      type: "offer_confirmed",
      offerId,
      title: "อีกฝ่ายยืนยันแล้ว",
    });

    logger.info({ offerId, userId }, "offer.confirmed");

    // Both sides confirmed → move to shipping, create shipment record
    if (total >= 2) {
      logger.info({ offerId }, "offer.both_confirmed");
      return startShipment(tx, offer);
    }

    return { offer, bothConfirmed: false };
  });
}

// ─── Internal helpers ─────────────────────────────────────────

type OfferRow = typeof offersTable.$inferSelect;

async function lockOffer(tx: DbOrTx, offerId: string): Promise<OfferRow> {
  const [offer] = await tx
    .select()
    .from(offersTable)
    .where(eq(offersTable.id, offerId))
    .for("update");

  if (!offer) throw new AppError(404, "not_found", "ไม่พบข้อเสนอ");
  return offer;
}

const TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["accepted", "rejected", "canceled"],
  accepted: ["canceled", "shipping"],
  shipping: ["completed"],
  rejected: [],
  canceled: [],
  completed: [],
};

function assertTransition(current: string, next: string) {
  if (!TRANSITIONS[current]?.includes(next)) {
    throw new AppError(
      409,
      "invalid_state",
      `ไม่สามารถเปลี่ยนสถานะจาก ${current} → ${next}`,
    );
  }
}

async function unlockOfferAssets(tx: DbOrTx, offer: OfferRow) {
  // Unlock sender's offered products
  const offerItems = await tx
    .select({ productId: offerItemsTable.productId })
    .from(offerItemsTable)
    .where(eq(offerItemsTable.offerId, offer.id));

  const offeredProductIds = offerItems
    .map((i) => i.productId)
    .filter((id): id is string => id !== null);

  await ProductService.unlockProducts(tx, offeredProductIds);

  // Target item is only locked after offer is accepted.
  // If we are cancelling from "accepted" state, unlock it too.
  if (offer.status === "accepted") {
    await ProductService.unlockProducts(tx, [offer.targetItemId]);
  }

  // Refund locked funds to sender
  await WalletService.releaseFunds(tx, {
    userId: offer.senderId,
    offerId: offer.id,
  });
}

async function startShipment(tx: DbOrTx, offer: OfferRow) {
  // Set offer to "shipping"
  const [updated] = await tx
    .update(offersTable)
    .set({ status: "shipping" })
    .where(eq(offersTable.id, offer.id))
    .returning();

  // Create shipment record (UNIQUE on offer_id prevents duplicates)
  const [shipment] = await tx
    .insert(shipmentsTable)
    .values({ offerId: offer.id, status: "pending" })
    .onConflictDoNothing()
    .returning();

  await NotificationService.notify(tx, {
    userId: offer.senderId,
    actorId: offer.receiverId,
    type: "offer_confirmed",
    offerId: offer.id,
    title: "ทั้งสองฝ่ายยืนยันแล้ว กำลังดำเนินการจัดส่ง",
  });
  await NotificationService.notify(tx, {
    userId: offer.receiverId,
    actorId: offer.senderId,
    type: "offer_confirmed",
    offerId: offer.id,
    title: "ทั้งสองฝ่ายยืนยันแล้ว กำลังดำเนินการจัดส่ง",
  });

  return { offer: updated, shipment, bothConfirmed: true };
}

// Exported so shipment.service can call it when shipment finishes
export async function completeTrade(tx: DbOrTx, offer: OfferRow) {
  // 1. Transfer sender's offered products → receiver
  const offerItems = await tx
    .select({ productId: offerItemsTable.productId })
    .from(offerItemsTable)
    .where(eq(offerItemsTable.offerId, offer.id));

  const offeredProductIds = offerItems
    .map((i) => i.productId)
    .filter((id): id is string => id !== null);

  await ProductService.tradeProducts(tx, offeredProductIds, offer.receiverId);

  // 2. Transfer target item → sender
  await ProductService.tradeProducts(tx, [offer.targetItemId], offer.senderId);

  // 3. Transfer locked funds to receiver
  await WalletService.transferFunds(tx, {
    fromUserId: offer.senderId,
    toUserId: offer.receiverId,
    offerId: offer.id,
  });

  // 4. Mark offer completed
  const [updated] = await tx
    .update(offersTable)
    .set({ status: "completed" })
    .where(eq(offersTable.id, offer.id))
    .returning();

  // 5. Notify both
  await NotificationService.notify(tx, {
    userId: offer.senderId,
    actorId: offer.receiverId,
    type: "trade_completed",
    offerId: offer.id,
    title: "การแลกเปลี่ยนสำเร็จแล้ว",
  });
  await NotificationService.notify(tx, {
    userId: offer.receiverId,
    actorId: offer.senderId,
    type: "trade_completed",
    offerId: offer.id,
    title: "การแลกเปลี่ยนสำเร็จแล้ว",
  });

  logger.info(
    { offerId: offer.id, senderId: offer.senderId, receiverId: offer.receiverId },
    "trade.completed",
  );
  return { offer: updated, bothConfirmed: true };
}

// ─── Counter offer ────────────────────────────────────────────

export async function counterOffer(
  originalOfferId: string,
  requesterId: string,
  input: Omit<CreateOfferInput, "targetItemId">,
) {
  return db.transaction(async (tx) => {
    const [original] = await tx
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, originalOfferId));

    if (!original) throw new AppError(404, "not_found", "ไม่พบข้อเสนอต้นฉบับ");
    if (original.receiverId !== requesterId) {
      throw new AppError(403, "forbidden", "เฉพาะผู้รับข้อเสนอเท่านั้นที่เสนอกลับได้");
    }
    if (original.status !== "pending") {
      throw new AppError(409, "invalid_state", "ข้อเสนอต้นฉบับไม่อยู่ในสถานะรอ");
    }

    // Reject the original offer
    await tx
      .update(offersTable)
      .set({ status: "rejected" })
      .where(eq(offersTable.id, originalOfferId));

    // Notify original sender their offer was countered
    await NotificationService.notify(tx, {
      userId: original.senderId,
      actorId: requesterId,
      type: "offer_rejected",
      offerId: originalOfferId,
      title: "ข้อเสนอของคุณถูกเสนอกลับด้วยเงื่อนไขใหม่",
    });

    // Create new counter offer (swap sender ↔ receiver)
    const counterInput = { ...input, targetItemId: original.targetItemId };
    const newOffer = await createOffer(requesterId, counterInput);

    return { originalOfferId, counterOffer: newOffer };
  });
}

// ─── Offer expiry ─────────────────────────────────────────────

export async function expireStaleOffers() {
  const expired = await db
    .update(offersTable)
    .set({ status: "canceled" })
    .where(
      and(
        eq(offersTable.status, "pending"),
        sql`${offersTable.createdAt} < NOW() - INTERVAL '72 hours'`,
      ),
    )
    .returning({ id: offersTable.id });
  return expired.length;
}
