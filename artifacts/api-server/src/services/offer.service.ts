import {
  db,
  itemsTable,
  offerChatsTable,
  offerConfirmationsTable,
  offerItemsTable,
  offersTable,
} from "@workspace/db";
import { and, count, desc, eq, or } from "drizzle-orm";
import { AppError } from "../lib/errors";
import * as WalletService from "./wallet.service";
import * as NotificationService from "./notification.service";

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
    // 1. Validate target item
    const [targetItem] = await tx
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, input.targetItemId));

    if (!targetItem) throw new AppError(404, "not_found", "ไม่พบสินค้า");
    if (targetItem.ownerId === fromUserId) {
      throw new AppError(
        400,
        "invalid_state",
        "ไม่สามารถขอแลกสินค้าของตัวเอง",
      );
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

    // 3. Validate all offered products are owned + active
    const offeredProductIds = input.items
      .filter((i) => i.productId)
      .map((i) => i.productId as string);

    for (const pid of offeredProductIds) {
      const [product] = await tx
        .select()
        .from(itemsTable)
        .where(eq(itemsTable.id, pid));
      if (!product) {
        throw new AppError(404, "not_found", `ไม่พบสินค้าที่ยื่นแลก: ${pid}`);
      }
      if (product.ownerId !== fromUserId) {
        throw new AppError(
          403,
          "forbidden",
          `สินค้า ${pid} ไม่ใช่ของคุณ`,
        );
      }
      if (product.status !== "active") {
        throw new AppError(
          409,
          "invalid_state",
          `สินค้า ${pid} ไม่อยู่ในสถานะพร้อมแลก`,
        );
      }
    }

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

    // 9. Lock offered products
    for (const pid of offeredProductIds) {
      await tx
        .update(itemsTable)
        .set({ status: "locked" })
        .where(eq(itemsTable.id, pid));
    }

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

    await NotificationService.notify(tx, {
      userId: offer.senderId,
      actorId: userId,
      type: "offer_accepted",
      offerId,
      title: "ข้อเสนอของคุณถูกตอบรับ",
    });

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

    // Both sides confirmed → complete transaction
    if (total >= 2) {
      return completeTrade(tx, offer);
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
  // Unlock offered products
  const items = await tx
    .select()
    .from(offerItemsTable)
    .where(and(eq(offerItemsTable.offerId, offer.id)));

  for (const item of items) {
    if (item.productId) {
      await tx
        .update(itemsTable)
        .set({ status: "active" })
        .where(eq(itemsTable.id, item.productId));
    }
  }

  // Refund locked funds
  await WalletService.releaseFunds(tx, {
    userId: offer.senderId,
    offerId: offer.id,
  });
}

async function completeTrade(tx: DbOrTx, offer: OfferRow) {
  // 1. Transfer offered products to receiver
  const items = await tx
    .select()
    .from(offerItemsTable)
    .where(eq(offerItemsTable.offerId, offer.id));

  for (const item of items) {
    if (item.productId) {
      await tx
        .update(itemsTable)
        .set({ status: "traded", ownerId: offer.receiverId })
        .where(eq(itemsTable.id, item.productId));
    }
  }

  // 2. Transfer target item to sender
  await tx
    .update(itemsTable)
    .set({ status: "traded", ownerId: offer.senderId })
    .where(eq(itemsTable.id, offer.targetItemId));

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
    type: "offer_confirmed",
    offerId: offer.id,
    title: "การแลกเปลี่ยนสำเร็จแล้ว",
  });
  await NotificationService.notify(tx, {
    userId: offer.receiverId,
    actorId: offer.senderId,
    type: "offer_confirmed",
    offerId: offer.id,
    title: "การแลกเปลี่ยนสำเร็จแล้ว",
  });

  return { offer: updated, bothConfirmed: true };
}
