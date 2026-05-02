import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { offers, offerItems, notifications } from "@db/schema";
import { sendPush } from "../lib/webPush";

export const offerRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const sent = await db.select().from(offers).where(eq(offers.fromUserId, ctx.userId)).orderBy(desc(offers.createdAt));
    const received = await db.select().from(offers).where(eq(offers.toUserId, ctx.userId)).orderBy(desc(offers.createdAt));
    return { sent, received };
  }),

  sent: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    return db.select().from(offers).where(eq(offers.fromUserId, ctx.userId)).orderBy(desc(offers.createdAt));
  }),

  received: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    return db.select().from(offers).where(eq(offers.toUserId, ctx.userId)).orderBy(desc(offers.createdAt));
  }),

  byId: authedQuery.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
    if (!rows.length) return null;
    const offer = rows[0];
    if (offer.fromUserId !== ctx.userId && offer.toUserId !== ctx.userId) return null;
    const ois = await db.select().from(offerItems).where(eq(offerItems.offerId, offer.id));
    return { ...offer, items: ois };
  }),

  create: authedQuery
    .input(
      z.object({
        targetItemId: z.string(),
        toUserId: z.string(),
        message: z.string().optional(),
        cashAmount: z.coerce.number().default(0),
        creditAmount: z.coerce.number().default(0),
        itemIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const id = crypto.randomUUID();
      await db.insert(offers).values({
        id,
        fromUserId: ctx.userId,
        toUserId: input.toUserId,
        targetItemId: input.targetItemId,
        message: input.message,
        cashAmount: input.cashAmount,
        creditAmount: input.creditAmount,
        status: "pending",
      });
      if (input.itemIds.length) {
        await db.insert(offerItems).values(
          input.itemIds.map((itemId) => ({ id: crypto.randomUUID(), offerId: id, itemId }))
        );
      }
      await db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: input.toUserId,
        type: "offer",
        title: "ข้อเสนอใหม่",
        body: "คุณได้รับข้อเสนอใหม่",
        data: { offerId: id },
      });
      await sendPush(input.toUserId, { title: "ข้อเสนอใหม่", body: "คุณได้รับข้อเสนอใหม่", data: { offerId: id } });
      return { id };
    }),

  accept: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
    if (!rows.length || rows[0].toUserId !== ctx.userId) throw new Error("Not authorized");
    await db.update(offers).set({ status: "accepted", updatedAt: new Date() }).where(eq(offers.id, input.id));
    return { ok: true };
  }),

  reject: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
    if (!rows.length || rows[0].toUserId !== ctx.userId) throw new Error("Not authorized");
    await db.update(offers).set({ status: "rejected", updatedAt: new Date() }).where(eq(offers.id, input.id));
    return { ok: true };
  }),

  cancel: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
    if (!rows.length || rows[0].fromUserId !== ctx.userId) throw new Error("Not authorized");
    await db.update(offers).set({ status: "cancelled", updatedAt: new Date() }).where(eq(offers.id, input.id));
    return { ok: true };
  }),

  confirm: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(offers).where(eq(offers.id, input.id)).limit(1);
    if (!rows.length || rows[0].toUserId !== ctx.userId) throw new Error("Not authorized");
    await db.update(offers).set({ status: "confirmed", updatedAt: new Date() }).where(eq(offers.id, input.id));
    return { ok: true };
  }),
});
