import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable, insertItemSchema } from "@workspace/db";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();
const publicItemStatus = "active" as const;

const createItemSchema = insertItemSchema.omit({
  ownerId: true,
  status: true,
});

const updateItemSchema = createItemSchema
  .partial()
  .extend({
    status: z.enum(["active", "paused", "closed"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "ต้องมีข้อมูลอย่างน้อย 1 ฟิลด์",
  });

function canAccessOwnItems(req: Request, ownerId: string | null): boolean {
  return Boolean(ownerId && req.isAuthenticated() && req.user.id === ownerId);
}

function canViewItem(req: Request, item: typeof itemsTable.$inferSelect): boolean {
  return item.status === publicItemStatus || canAccessOwnItems(req, item.ownerId);
}

router.get("/items", async (req: Request, res: Response) => {
  const conditions = [];
  const ownerId = typeof req.query.owner_id === "string" ? req.query.owner_id : null;
  if (!canAccessOwnItems(req, ownerId)) {
    conditions.push(eq(itemsTable.status, publicItemStatus));
  }

  const category = typeof req.query.category === "string" ? req.query.category : null;
  if (category && category !== "all") {
    conditions.push(eq(itemsTable.category, category));
  }

  const dealType = typeof req.query.deal_type === "string" ? req.query.deal_type : null;
  if (dealType === "swap") {
    conditions.push(inArray(itemsTable.dealType, ["swap", "both"] as const));
  } else if (dealType === "buy") {
    conditions.push(inArray(itemsTable.dealType, ["buy", "both"] as const));
  } else if (dealType === "both") {
    conditions.push(eq(itemsTable.dealType, "both" as const));
  } else if (dealType === "feed") {
    // feed excludes pure buy
    conditions.push(inArray(itemsTable.dealType, ["swap", "both"] as const));
  }

  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search) {
    conditions.push(ilike(itemsTable.title, `%${search}%`));
  }

  if (ownerId) {
    conditions.push(eq(itemsTable.ownerId, ownerId));
  }

  const rows = await db
    .select()
    .from(itemsTable)
    .where(and(...conditions))
    .orderBy(desc(itemsTable.createdAt));

  res.json({ items: rows });
});

router.get("/items/:id", async (req: Request, res: Response) => {
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, String(req.params.id)));

  if (!item || !canViewItem(req, item)) {
    res.status(404).json({ error: "ไม่พบสินค้า" });
    return;
  }

  res.json({ item });
});

router.post("/items", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = createItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ข้อมูลสินค้าไม่ครบ", details: parsed.error.issues });
    return;
  }
  const [created] = await db
    .insert(itemsTable)
    .values({ ...parsed.data, ownerId: req.user.id })
    .returning();
  res.json({ item: created });
});

router.patch("/items/:id", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;

  const parsed = updateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ข้อมูลสินค้าที่ต้องการแก้ไขไม่ถูกต้อง" });
    return;
  }

  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, String(req.params.id)));

  if (!item) {
    res.status(404).json({ error: "ไม่พบสินค้า" });
    return;
  }

  if (item.ownerId !== req.user.id) {
    res.status(403).json({ error: "แก้ไขได้เฉพาะสินค้าของตัวเอง" });
    return;
  }

  const [updated] = await db
    .update(itemsTable)
    .set(parsed.data)
    .where(eq(itemsTable.id, item.id))
    .returning();

  res.json({ item: updated });
});

router.delete("/items/:id", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;

  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, String(req.params.id)));

  if (!item) {
    res.status(404).json({ error: "ไม่พบสินค้า" });
    return;
  }

  if (item.ownerId !== req.user.id) {
    res.status(403).json({ error: "ลบได้เฉพาะสินค้าของตัวเอง" });
    return;
  }

  await db.delete(itemsTable).where(
    and(eq(itemsTable.id, item.id), eq(itemsTable.ownerId, req.user.id)),
  );

  res.json({ ok: true });
});

export default router;
