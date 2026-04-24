import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable, bookmarksTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

const saveBookmarkSchema = z.object({
  itemId: z.string().trim().min(1),
});

router.get("/bookmarks", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const rows = await db
    .select({ item: itemsTable })
    .from(bookmarksTable)
    .innerJoin(itemsTable, eq(bookmarksTable.itemId, itemsTable.id))
    .where(eq(bookmarksTable.userId, req.user.id))
    .orderBy(desc(bookmarksTable.createdAt));

  const savedItems = rows.map((row) => row.item);
  res.json({ items: savedItems, itemIds: savedItems.map((item) => item.id) });
});

router.post("/bookmarks", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = saveBookmarkSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "itemId ไม่ถูกต้อง" });
    return;
  }

  const [item] = await db
    .select({ id: itemsTable.id })
    .from(itemsTable)
    .where(eq(itemsTable.id, parsed.data.itemId));
  if (!item) {
    res.status(404).json({ error: "ไม่พบสินค้า" });
    return;
  }

  await db
    .insert(bookmarksTable)
    .values({
      userId: req.user.id,
      itemId: parsed.data.itemId,
    })
    .onConflictDoNothing();

  res.json({ ok: true, itemId: parsed.data.itemId });
});

router.delete(
  "/bookmarks/:itemId",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const itemId = String(req.params.itemId || "").trim();
    if (!itemId) {
      res.status(400).json({ error: "itemId ไม่ถูกต้อง" });
      return;
    }

    await db
      .delete(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.userId, req.user.id),
          eq(bookmarksTable.itemId, itemId),
        ),
      );
    res.json({ ok: true, itemId });
  },
);

export default router;
