import { z } from "zod";
import { eq, or } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { deals } from "@db/schema";

export const dealRouter = createRouter({
  mine: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(deals)
      .where(or(eq(deals.buyerId, ctx.userId), eq(deals.sellerId, ctx.userId)));
    return rows;
  }),

  byId: authedQuery.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    const rows = await db.select().from(deals).where(eq(deals.id, input.id)).limit(1);
    if (!rows.length) return null;
    const deal = rows[0];
    if (deal.buyerId !== ctx.userId && deal.sellerId !== ctx.userId) return null;
    return deal;
  }),

  updateStage: authedQuery
    .input(z.object({ id: z.string(), stage: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const rows = await db.select().from(deals).where(eq(deals.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Not found");
      const deal = rows[0];
      if (deal.buyerId !== ctx.userId && deal.sellerId !== ctx.userId) throw new Error("Not authorized");
      await db.update(deals).set({ stage: input.stage, updatedAt: new Date() }).where(eq(deals.id, input.id));
      return { ok: true };
    }),

  updateLogistics: authedQuery
    .input(z.object({ id: z.string(), logistics: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const rows = await db.select().from(deals).where(eq(deals.id, input.id)).limit(1);
      if (!rows.length) throw new Error("Not found");
      const deal = rows[0];
      if (deal.buyerId !== ctx.userId && deal.sellerId !== ctx.userId) throw new Error("Not authorized");
      await db.update(deals).set({ logistics: input.logistics, updatedAt: new Date() }).where(eq(deals.id, input.id));
      return { ok: true };
    }),
});
