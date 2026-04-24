import { db, offerChatsTable, offerMessagesTable, offersTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import { AppError } from "../lib/errors";

// ─── Queries ─────────────────────────────────────────────────

export async function getChatByOfferId(offerId: string, requesterId: string) {
  // Verify requester is a participant
  const [offer] = await db
    .select({
      senderId: offersTable.senderId,
      receiverId: offersTable.receiverId,
    })
    .from(offersTable)
    .where(eq(offersTable.id, offerId));

  if (!offer) throw new AppError(404, "not_found", "ไม่พบข้อเสนอ");
  if (offer.senderId !== requesterId && offer.receiverId !== requesterId) {
    throw new AppError(403, "forbidden", "ไม่มีสิทธิ์เข้าถึงแชทนี้");
  }

  const [chat] = await db
    .select()
    .from(offerChatsTable)
    .where(eq(offerChatsTable.offerId, offerId));

  if (!chat) throw new AppError(404, "not_found", "ไม่พบแชทสำหรับข้อเสนอนี้");

  const messages = await db
    .select()
    .from(offerMessagesTable)
    .where(eq(offerMessagesTable.chatId, chat.id))
    .orderBy(asc(offerMessagesTable.createdAt));

  return { chat, messages };
}

// ─── Send message ─────────────────────────────────────────────

export async function sendMessage(
  offerId: string,
  senderId: string,
  message: string,
) {
  return db.transaction(async (tx) => {
    // Verify sender is a participant
    const [offer] = await tx
      .select({
        senderId: offersTable.senderId,
        receiverId: offersTable.receiverId,
        status: offersTable.status,
      })
      .from(offersTable)
      .where(eq(offersTable.id, offerId));

    if (!offer) throw new AppError(404, "not_found", "ไม่พบข้อเสนอ");
    if (offer.senderId !== senderId && offer.receiverId !== senderId) {
      throw new AppError(403, "forbidden", "ไม่มีสิทธิ์ส่งข้อความในแชทนี้");
    }
    if (offer.status === "completed" || offer.status === "rejected" || offer.status === "canceled") {
      throw new AppError(409, "invalid_state", "ไม่สามารถส่งข้อความในข้อเสนอที่สิ้นสุดแล้ว");
    }

    const [chat] = await tx
      .select()
      .from(offerChatsTable)
      .where(eq(offerChatsTable.offerId, offerId));

    if (!chat) throw new AppError(404, "not_found", "ไม่พบแชทสำหรับข้อเสนอนี้");

    const [created] = await tx
      .insert(offerMessagesTable)
      .values({ chatId: chat.id, senderId, message })
      .returning();

    return created;
  });
}
