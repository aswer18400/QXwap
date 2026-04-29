import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { bookmarks, items, itemImages } from "@db/schema";

export const bookmarkRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, ctx.userId))
      .orderBy(desc(bookmarks.createdAt));
    const itemIds = rows.map((r) => r.itemId);
    if (!itemIds.length) return [];
    const its = await db.select().from(items).where(inArray(items.id, itemIds));
    const imgs = await db.select().from(itemImages).where(inArray(itemImages.itemId, itemIds));
    const imgMap = new Map<string, typeof imgs[number][]>();
    for (const img of imgs) {
      const arr = imgMap.get(img.itemId) || [];
      arr.push(img);
      imgMap.set(img.itemId, arr);
    }
    return its.map((it) => ({ ...it, images: imgMap.get(it.id) || [] }));
  }),

  create: authedQuery
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db.insert(bookmarks).values({ userId: ctx.userId, itemId: input.itemId }).onConflictDoNothing();
      return { ok: true };
    }),

  delete: authedQuery
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, ctx.userId), eq(bookmarks.itemId, input.itemId)));
      return { ok: true };
    }),
});
