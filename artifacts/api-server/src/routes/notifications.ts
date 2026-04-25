import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, notificationsTable, profilesTable } from "@workspace/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();

// ─── GET /notifications ──────────────────────────────────────

router.get(
  "/notifications",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user.id))
      .orderBy(desc(notificationsTable.createdAt));

    res.json({ notifications: rows });
  },
);

// ─── POST /notifications/read ────────────────────────────────
// Body: { ids?: string[] }
// Omit ids to mark all as read.

const markReadSchema = z.object({
  ids: z.array(z.string().min(1)).optional(),
});

router.post(
  "/notifications/read",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "ข้อมูลไม่ถูกต้อง", parsed.error);
      return;
    }

    const { ids } = parsed.data;
    const userId = req.user.id;

    const filter =
      ids && ids.length > 0
        ? and(
            eq(notificationsTable.userId, userId),
            inArray(notificationsTable.id, ids),
          )
        : eq(notificationsTable.userId, userId);

    const updated = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(filter)
      .returning();

    res.json({ updated: updated.length });
  },
);

// ─── GET /notifications/settings ─────────────────────────────
router.get("/notifications/settings", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const [profile] = await db.select({ s: profilesTable.notificationSettings }).from(profilesTable).where(eq(profilesTable.id, req.user.id));
  let settings = {};
  try { settings = JSON.parse(profile?.s || "{}"); } catch { /* ignore */ }
  res.json({ settings });
});

// ─── PATCH /notifications/settings ───────────────────────────
const settingsSchema = z.object({
  offer_received: z.boolean().optional(),
  offer_accepted: z.boolean().optional(),
  offer_rejected: z.boolean().optional(),
  deal_stage_updated: z.boolean().optional(),
  shipment_updated: z.boolean().optional(),
  trade_completed: z.boolean().optional(),
  new_message: z.boolean().optional(),
});

router.patch("/notifications/settings", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) { sendValidationError(res, "ข้อมูลไม่ถูกต้อง", parsed.error); return; }
  const [profile] = await db.select({ s: profilesTable.notificationSettings }).from(profilesTable).where(eq(profilesTable.id, req.user.id));
  let current = {};
  try { current = JSON.parse(profile?.s || "{}"); } catch { /* ignore */ }
  const merged = { ...current, ...parsed.data };
  await db.update(profilesTable).set({ notificationSettings: JSON.stringify(merged) }).where(eq(profilesTable.id, req.user.id));
  res.json({ settings: merged });
});

export default router;
