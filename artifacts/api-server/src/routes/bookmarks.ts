import { Router, type IRouter, type Request, type Response } from "express";
import { db, itemsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { primaryKey, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: varchar("user_id").notNull(),
    itemId: varchar("item_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.itemId] })],
);

let ensureBookmarksTablePromise: Promise<void> | null = null;

async function ensureBookmarksTable() {
  if (!ensureBookmarksTablePromise) {
    ensureBookmarksTablePromise = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS bookmarks (
          user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          item_id varchar NOT NULL REFERENCES items(id) ON DELETE CASCADE,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (user_id, item_id)
        )
      `);
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS bookmarks_user_created_idx ON bookmarks (user_id, created_at DESC)`,
      );
    })().catch((error) => {
      ensureBookmarksTablePromise = null;
      throw error;
    });
  }
  await ensureBookmarksTablePromise;
}

const router: IRouter = Router();

const saveBookmarkSchema = z.object({
  itemId: z.string().trim().min(1),
});

router.get("/bookmarks", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  await ensureBookmarksTable();
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

  await ensureBookmarksTable();
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

    await ensureBookmarksTable();
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
