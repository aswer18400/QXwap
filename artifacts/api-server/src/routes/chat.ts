import { Router, type IRouter, type Request, type Response } from "express";
import {
  conversationsTable,
  db,
  dealsTable,
  itemsTable,
  messagesTable,
  profilesTable,
} from "@workspace/db";
import { asc, desc, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

function isParticipant(
  userId: string,
  conversation: {
    participantAId: string;
    participantBId: string;
  },
): boolean {
  return (
    conversation.participantAId === userId ||
    conversation.participantBId === userId
  );
}

function hasValidDealParticipants(
  conversation: {
    participantAId: string;
    participantBId: string;
  },
  deal: {
    senderId: string;
    receiverId: string;
  },
): boolean {
  return (
    (conversation.participantAId === deal.senderId &&
      conversation.participantBId === deal.receiverId) ||
    (conversation.participantAId === deal.receiverId &&
      conversation.participantBId === deal.senderId)
  );
}

router.get(
  "/chat/conversations",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const uid = req.user.id;

    const rows = await db
      .select({
        conversation: conversationsTable,
        dealSenderId: dealsTable.senderId,
        dealReceiverId: dealsTable.receiverId,
        dealStage: dealsTable.stage,
        itemId: itemsTable.id,
        itemTitle: itemsTable.title,
        itemImageEmoji: itemsTable.imageEmoji,
      })
      .from(conversationsTable)
      .innerJoin(dealsTable, eq(conversationsTable.dealId, dealsTable.id))
      .innerJoin(itemsTable, eq(dealsTable.targetItemId, itemsTable.id))
      .where(
        or(
          eq(conversationsTable.participantAId, uid),
          eq(conversationsTable.participantBId, uid),
        ),
      )
      .orderBy(desc(conversationsTable.lastMessageAt));

    const conversations = [];
    for (const row of rows) {
      const { conversation } = row;
      if (
        !hasValidDealParticipants(conversation, {
          senderId: row.dealSenderId,
          receiverId: row.dealReceiverId,
        })
      ) {
        continue;
      }

      const otherParticipantId =
        conversation.participantAId === uid
          ? conversation.participantBId
          : conversation.participantAId;
      const [otherProfile] = await db
        .select({
          id: profilesTable.id,
          displayName: profilesTable.displayName,
          username: profilesTable.username,
          avatarUrl: profilesTable.avatarUrl,
        })
        .from(profilesTable)
        .where(eq(profilesTable.id, otherParticipantId));

      conversations.push({
        id: conversation.id,
        dealId: conversation.dealId,
        participantAId: conversation.participantAId,
        participantBId: conversation.participantBId,
        lastMessage: conversation.lastMessage,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        otherParticipant: otherProfile
          ? {
              id: otherProfile.id,
              displayName: otherProfile.displayName,
              username: otherProfile.username,
              avatarUrl: otherProfile.avatarUrl,
            }
          : null,
        deal: {
          stage: row.dealStage,
          targetItem: {
            id: row.itemId,
            title: row.itemTitle,
            imageEmoji: row.itemImageEmoji,
          },
        },
      });
    }

    res.json({ conversations });
  },
);

router.get(
  "/chat/conversations/:conversationId/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const conversationId = String(req.params.conversationId);

    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId));
    if (!conversation) {
      res.status(404).json({ error: "ไม่พบบทสนทนา" });
      return;
    }
    if (!isParticipant(req.user.id, conversation)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงบทสนทนานี้" });
      return;
    }

    const [deal] = await db
      .select({
        senderId: dealsTable.senderId,
        receiverId: dealsTable.receiverId,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, conversation.dealId));
    if (
      !deal ||
      !hasValidDealParticipants(conversation, {
        senderId: deal.senderId,
        receiverId: deal.receiverId,
      })
    ) {
      res.status(403).json({ error: "บทสนทนานี้ไม่สอดคล้องกับดีลปัจจุบัน" });
      return;
    }

    const rows = await db
      .select({
        message: messagesTable,
        senderDisplayName: profilesTable.displayName,
        senderUsername: profilesTable.username,
        senderAvatarUrl: profilesTable.avatarUrl,
      })
      .from(messagesTable)
      .leftJoin(profilesTable, eq(messagesTable.senderId, profilesTable.id))
      .where(eq(messagesTable.conversationId, conversation.id))
      .orderBy(asc(messagesTable.createdAt));

    res.json({
      conversation,
      messages: rows.map((row) => ({
        ...row.message,
        senderProfile: {
          displayName: row.senderDisplayName,
          username: row.senderUsername,
          avatarUrl: row.senderAvatarUrl,
        },
      })),
    });
  },
);

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

router.post(
  "/chat/conversations/:conversationId/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const conversationId = String(req.params.conversationId);
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "ข้อความไม่ถูกต้อง" });
      return;
    }

    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, conversationId));
    if (!conversation) {
      res.status(404).json({ error: "ไม่พบบทสนทนา" });
      return;
    }
    if (!isParticipant(req.user.id, conversation)) {
      res.status(403).json({ error: "ไม่มีสิทธิ์ส่งข้อความในบทสนทนานี้" });
      return;
    }

    const [deal] = await db
      .select({
        senderId: dealsTable.senderId,
        receiverId: dealsTable.receiverId,
      })
      .from(dealsTable)
      .where(eq(dealsTable.id, conversation.dealId));
    if (
      !deal ||
      !hasValidDealParticipants(conversation, {
        senderId: deal.senderId,
        receiverId: deal.receiverId,
      })
    ) {
      res.status(403).json({ error: "ไม่สามารถส่งข้อความในบทสนทนานี้ได้" });
      return;
    }

    const [created] = await db
      .insert(messagesTable)
      .values({
        conversationId: conversation.id,
        senderId: req.user.id,
        content: parsed.data.content,
      })
      .returning();

    await db
      .update(conversationsTable)
      .set({
        lastMessage: created.content,
        lastMessageAt: created.createdAt,
      })
      .where(eq(conversationsTable.id, conversation.id));

    res.status(201).json({ message: created });
  },
);

export default router;
