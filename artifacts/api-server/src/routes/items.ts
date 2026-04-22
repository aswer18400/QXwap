import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable, insertItemSchema } from "@workspace/db";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();
const itemIdSchema = /^.{1,}$/;

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
    sendValidationError(res, "ข้อมูลสินค้าไม่ครบ", parsed.error);
    return;
  }

  const priceCash = parsed.data.priceCash ?? 0;
  const priceCredit = parsed.data.priceCredit ?? 0;
  const title = parsed.data.title.trim();
  const category = parsed.data.category.trim();
  const wantedText = parsed.data.wantedText?.trim() ?? "";

  if (!title) {
    sendError(res, 400, "bad_request", "ต้องระบุชื่อสินค้า");
    return;
  }
  if (!category) {
    sendError(res, 400, "bad_request", "ต้องระบุหมวดหมู่สินค้า");
    return;
  }

  if (priceCash < 0 || priceCredit < 0) {
    sendError(res, 400, "bad_request", "ราคาเงินสดและเครดิตต้องไม่ติดลบ");
    return;
  }

  const hasSwapValue = priceCredit > 0 || Boolean(wantedText);
  const hasBuyValue = priceCash > 0;
  if (parsed.data.dealType === "swap" && !hasSwapValue) {
    sendError(
      res,
      409,
      "invalid_state",
      "สินค้าสำหรับแลกต้องระบุมูลค่าการแลกอย่างน้อยหนึ่งอย่าง",
    );
    return;
  }
  if (parsed.data.dealType === "buy" && !hasBuyValue) {
    sendError(
      res,
      409,
      "invalid_state",
      "สินค้าสำหรับขายต้องมีราคาเงินสดมากกว่า 0",
    );
    return;
  }
  if (parsed.data.dealType === "both" && !hasSwapValue && !hasBuyValue) {
    sendError(
      res,
      409,
      "invalid_state",
      "สินค้าที่ซื้อหรือแลกได้ต้องมีราคาเงินสด เครดิต หรือความต้องการแลก",
    );
    return;
  }

  const [created] = await db
    .insert(itemsTable)
    .values({ ...parsed.data, title, category, wantedText, ownerId: req.user.id })
    .returning();
  res.json({ item: created });
});

export default router;
