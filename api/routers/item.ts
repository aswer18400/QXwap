import { z } from "zod";
import { eq, and, or, sql, desc, asc, inArray, gte, lte, ilike } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { items, itemImages, users, profiles, follows } from "@db/schema";

export const itemRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        q: z.string().optional(),
        category: z.string().optional(),
        dealType: z.string().optional(),
        minPrice: z.coerce.number().optional(),
        maxPrice: z.coerce.number().optional(),
        openToOffers: z.boolean().optional(),
        wantedTag: z.string().optional(),
        ownerId: z.string().optional(),
        following: z.boolean().optional(),
        nearbyRadiusKm: z.coerce.number().optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        fastResponder: z.boolean().optional(),
        featured: z.boolean().optional(),
        status: z.string().optional(),
        condition: z.string().optional(),
        sort: z.string().optional(),
        limit: z.coerce.number().default(20),
        offset: z.coerce.number().default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const filters = [];
      const i = items;
      if (input?.q) filters.push(or(ilike(i.title, `%${input.q}%`), ilike(i.description, `%${input.q}%`)));
      if (input?.category) filters.push(eq(i.category, input.category));
      if (input?.dealType) filters.push(eq(i.dealType, input.dealType));
      if (input?.ownerId) filters.push(eq(i.ownerId, input.ownerId));
      if (input?.openToOffers) filters.push(eq(i.openToOffers, true));
      if (input?.wantedTag) {
        filters.push(sql`${i.wantedTags} @> ARRAY[${input.wantedTag}]::text[]`);
      }
      if (input?.minPrice !== undefined) filters.push(gte(i.priceCash, input.minPrice));
      if (input?.maxPrice !== undefined) filters.push(lte(i.priceCash, input.maxPrice));
      if (input?.fastResponder) {
        // join profiles and filter
      }
      if (input?.featured) {
        // join profiles
      }
      if (input?.following && ctx.userId) {
        const followRows = await db.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, ctx.userId));
        const ids = followRows.map((r) => r.followingId);
        if (ids.length) filters.push(inArray(i.ownerId, ids));
        else filters.push(sql`1=0`); // no results
      }

      if (input?.status) filters.push(eq(i.status, input.status));
      if (input?.condition) filters.push(eq(i.condition, input.condition));

      const whereClause = filters.length ? and(...filters) : undefined;

      let orderBy = desc(i.createdAt);
      if (input?.sort === "nearby") {
        // stub
      } else if (input?.sort === "price_asc") {
        orderBy = asc(i.priceCash);
      } else if (input?.sort === "price_desc") {
        orderBy = desc(i.priceCash);
      } else if (input?.sort === "most_requested") {
        orderBy = desc(i.requestCount);
      }

      const rows = await db.select().from(i).where(whereClause).orderBy(orderBy).limit(input?.limit || 20).offset(input?.offset || 0);
      const imgs = await db.select().from(itemImages);
      const usersRows = await db.select({ id: users.id, email: users.email }).from(users);
      const profs = await db.select().from(profiles);

      const imgMap = new Map<string, typeof imgs[number][]>();
      for (const img of imgs) {
        const arr = imgMap.get(img.itemId) || [];
        arr.push(img);
        imgMap.set(img.itemId, arr);
      }
      const userMap = new Map(usersRows.map((u) => [u.id, u]));
      const profMap = new Map(profs.map((p) => [p.id, p]));

      return rows.map((item) => ({
        ...item,
        images: imgMap.get(item.id) || [],
        owner: { ...userMap.get(item.ownerId), profile: profMap.get(item.ownerId) },
      }));
    }),

  feed: publicQuery
    .input(z.object({ limit: z.coerce.number().default(20), offset: z.coerce.number().default(0) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const rows = await db.select().from(items).where(eq(items.status, "active")).orderBy(desc(items.createdAt)).limit(input?.limit || 20).offset(input?.offset || 0);
      const imgs = await db.select().from(itemImages);
      const usersRows = await db.select({ id: users.id, email: users.email }).from(users);
      const profs = await db.select().from(profiles);
      const imgMap = new Map<string, typeof imgs[number][]>();
      for (const img of imgs) {
        const arr = imgMap.get(img.itemId) || [];
        arr.push(img);
        imgMap.set(img.itemId, arr);
      }
      const userMap = new Map(usersRows.map((u) => [u.id, u]));
      const profMap = new Map(profs.map((p) => [p.id, p]));
      return rows.map((item) => ({
        ...item,
        images: imgMap.get(item.id) || [],
        owner: { ...userMap.get(item.ownerId), profile: profMap.get(item.ownerId) },
      }));
    }),

  byId: publicQuery.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    const rows = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
    if (!rows.length) return null;
    const item = rows[0];
    const imgs = await db.select().from(itemImages).where(eq(itemImages.itemId, item.id)).orderBy(asc(itemImages.sortOrder));
    const owner = await db.select().from(users).where(eq(users.id, item.ownerId)).limit(1);
    const prof = await db.select().from(profiles).where(eq(profiles.id, item.ownerId)).limit(1);
    return {
      ...item,
      images: imgs,
      owner: owner[0] ? { ...owner[0], profile: prof[0] || null } : null,
    };
  }),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        condition: z.string().optional(),
        dealType: z.string().default("swap"),
        priceCash: z.coerce.number().optional(),
        priceCredit: z.coerce.number().optional(),
        openToOffers: z.boolean().default(false),
        wantedText: z.string().optional(),
        wantedTags: z.array(z.string()).optional(),
        locationLabel: z.string().optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
        images: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const id = crypto.randomUUID();
      const priceCash = input.priceCash ?? 0;
      const priceCredit = input.priceCredit ?? 0;
      await db.insert(items).values({
        id,
        ownerId: ctx.userId,
        title: input.title,
        description: input.description,
        category: input.category,
        condition: input.condition,
        dealType: input.dealType,
        priceCash,
        priceCredit,
        openToOffers: input.openToOffers,
        wantedText: input.wantedText,
        wantedTags: input.wantedTags,
        locationLabel: input.locationLabel,
        latitude: input.latitude?.toString(),
        longitude: input.longitude?.toString(),
        status: "active",
      });
      if (input.images.length) {
        await db.insert(itemImages).values(
          input.images.map((url, idx) => ({ id: crypto.randomUUID(), itemId: id, url, sortOrder: idx }))
        );
      }
      return { id };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        condition: z.string().optional(),
        dealType: z.string().optional(),
        priceCash: z.coerce.number().optional(),
        priceCredit: z.coerce.number().optional(),
        openToOffers: z.boolean().optional(),
        wantedText: z.string().optional(),
        wantedTags: z.array(z.string()).optional(),
        locationLabel: z.string().optional(),
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
        images: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const existing = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
      if (!existing.length || existing[0].ownerId !== ctx.userId) {
        throw new Error("Not authorized");
      }
      const { id, images, latitude, longitude, ...rest } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (rest.title !== undefined) updateData.title = rest.title;
      if (rest.description !== undefined) updateData.description = rest.description;
      if (rest.category !== undefined) updateData.category = rest.category;
      if (rest.condition !== undefined) updateData.condition = rest.condition;
      if (rest.dealType !== undefined) updateData.dealType = rest.dealType;
      if (rest.priceCash !== undefined) updateData.priceCash = rest.priceCash;
      if (rest.priceCredit !== undefined) updateData.priceCredit = rest.priceCredit;
      if (rest.openToOffers !== undefined) updateData.openToOffers = rest.openToOffers;
      if (rest.wantedText !== undefined) updateData.wantedText = rest.wantedText;
      if (rest.wantedTags !== undefined) updateData.wantedTags = rest.wantedTags;
      if (rest.locationLabel !== undefined) updateData.locationLabel = rest.locationLabel;
      if (latitude !== undefined) updateData.latitude = latitude.toString();
      if (longitude !== undefined) updateData.longitude = longitude.toString();
      await db.update(items).set(updateData).where(eq(items.id, id));
      if (images) {
        await db.delete(itemImages).where(eq(itemImages.itemId, id));
        if (images.length) {
          await db.insert(itemImages).values(
            images.map((url, idx) => ({ id: crypto.randomUUID(), itemId: id, url, sortOrder: idx }))
          );
        }
      }
      return { id };
    }),

  delete: authedQuery.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    const existing = await db.select().from(items).where(eq(items.id, input.id)).limit(1);
    if (!existing.length || existing[0].ownerId !== ctx.userId) {
      throw new Error("Not authorized");
    }
    await db.delete(items).where(eq(items.id, input.id));
    return { ok: true };
  }),
});
