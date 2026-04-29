import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { follows } from "@db/schema";

export const followRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db.select().from(follows).where(eq(follows.followerId, ctx.userId));
    return rows;
  }),

  create: authedQuery
    .input(z.object({ followingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db.insert(follows).values({ followerId: ctx.userId, followingId: input.followingId }).onConflictDoNothing();
      return { ok: true };
    }),

  delete: authedQuery
    .input(z.object({ followingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db
        .delete(follows)
        .where(and(eq(follows.followerId, ctx.userId), eq(follows.followingId, input.followingId)));
      return { ok: true };
    }),
});
