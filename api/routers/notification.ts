import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { notifications } from "@db/schema";

export const notificationRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, ctx.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }),

  read: authedQuery
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      for (const id of input.ids) {
        await db
          .update(notifications)
          .set({ readAt: new Date() })
          .where(eq(notifications.id, id));
      }
      return { ok: true };
    }),
});
