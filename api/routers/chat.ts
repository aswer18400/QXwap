import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { chatConversations, chatParticipants, chatMessages } from "@db/schema";

export const chatRouter = createRouter({
  conversations: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const parts = await db.select().from(chatParticipants).where(eq(chatParticipants.userId, ctx.userId));
    const convIds = parts.map((p) => p.conversationId);
    if (!convIds.length) return [];
    const convs = await db.select().from(chatConversations).where(inArray(chatConversations.id, convIds));
    return convs;
  }),

  messages: authedQuery
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const parts = await db
        .select()
        .from(chatParticipants)
        .where(and(eq(chatParticipants.conversationId, input.conversationId), eq(chatParticipants.userId, ctx.userId)));
      if (!parts.length) return [];
      return db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, input.conversationId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(100);
    }),

  sendMessage: authedQuery
    .input(z.object({ conversationId: z.string(), text: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const parts = await db
        .select()
        .from(chatParticipants)
        .where(and(eq(chatParticipants.conversationId, input.conversationId), eq(chatParticipants.userId, ctx.userId)));
      if (!parts.length) throw new Error("Not in conversation");
      const id = crypto.randomUUID();
      await db.insert(chatMessages).values({
        id,
        conversationId: input.conversationId,
        senderId: ctx.userId,
        text: input.text,
      });
      return { id };
    }),

  createConversation: authedQuery
    .input(z.object({ offerId: z.string().optional(), participantIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.insert(chatConversations).values({ id, offerId: input.offerId || null });
      const allIds = [...new Set([ctx.userId, ...input.participantIds])];
      await db.insert(chatParticipants).values(
        allIds.map((uid) => ({ conversationId: id, userId: uid }))
      );
      return { id };
    }),
});
