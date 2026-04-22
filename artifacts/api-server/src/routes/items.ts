import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable, insertItemSchema } from "@workspace/db";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get("/items", async (req: Request, res: Response) => {
  const conditions = [eq(itemsTable.status, "active" as const)];

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

  const ownerId = typeof req.query.owner_id === "string" ? req.query.owner_id : null;
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

router.post("/items", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = insertItemSchema
    .omit({ ownerId: true })
    .safeParse(req.body);
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

export default router;
