import { z } from "zod";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { profiles, users, items, itemImages } from "@db/schema";

export const profileRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    const db = await getDb();
    const rows = await db.select().from(profiles).where(eq(profiles.id, ctx.userId)).limit(1);
    const userRows = await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1);
    return { profile: rows[0] || null, user: userRows[0] || null };
  }),

  updateMe: authedQuery
    .input(
      z.object({
        displayName: z.string().optional(),
        username: z.string().optional(),
        city: z.string().optional(),
        bio: z.string().optional(),
        avatarUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const existing = await db.select().from(profiles).where(eq(profiles.id, ctx.userId)).limit(1);
      const now = new Date();
      if (!existing.length) {
        await db.insert(profiles).values({ id: ctx.userId, ...input, updatedAt: now });
      } else {
        await db.update(profiles).set({ ...input, updatedAt: now }).where(eq(profiles.id, ctx.userId));
      }
      return { ok: true };
    }),

  byId: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    const prof = await db.select().from(profiles).where(eq(profiles.id, input.id)).limit(1);
    const user = await db.select().from(users).where(eq(users.id, input.id)).limit(1);
    const userItems = await db.select().from(items).where(eq(items.ownerId, input.id));
    const imgs = await db.select().from(itemImages);
    const imgMap = new Map<string, typeof imgs[number][]>();
    for (const img of imgs) {
      const arr = imgMap.get(img.itemId) || [];
      arr.push(img);
      imgMap.set(img.itemId, arr);
    }
    return {
      profile: prof[0] || null,
      user: user[0] || null,
      listings: userItems.map((it) => ({ ...it, images: imgMap.get(it.id) || [] })),
    };
  }),
});
