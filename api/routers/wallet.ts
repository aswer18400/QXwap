import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { wallets, transactions } from "@db/schema";

export const walletRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db.select().from(wallets).where(eq(wallets.userId, ctx.userId)).limit(1);
    return rows[0] || { userId: ctx.userId, creditBalance: 0 };
  }),

  transactions: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    return db.select().from(transactions).where(eq(transactions.userId, ctx.userId)).orderBy(desc(transactions.createdAt));
  }),

  deposit: authedQuery
    .input(z.object({ amount: z.coerce.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const existing = await db.select().from(wallets).where(eq(wallets.userId, ctx.userId)).limit(1);
      if (!existing.length) {
        await db.insert(wallets).values({ userId: ctx.userId, creditBalance: input.amount });
      } else {
        const current = existing[0].creditBalance ?? 0;
        await db
          .update(wallets)
          .set({ creditBalance: current + input.amount, updatedAt: new Date() })
          .where(eq(wallets.userId, ctx.userId));
      }
      await db.insert(transactions).values({
        id: crypto.randomUUID(),
        userId: ctx.userId,
        amount: input.amount,
        type: "deposit",
        description: "เติมเครดิต",
      });
      return { ok: true };
    }),
});
