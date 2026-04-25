import { Router, type Request, type Response } from "express";
import { db, reviewsTable, dealsTable, profilesTable } from "@workspace/db";
import { and, avg, count, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router = Router();

const createReviewSchema = z.object({
  dealId: z.string().min(1).optional(),
  offerId: z.string().min(1).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
}).refine(v => v.dealId || v.offerId, { message: "ต้องระบุ dealId หรือ offerId" });

router.post("/reviews", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const uid = req.user.id;

  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลรีวิวไม่ถูกต้อง", parsed.error);
    return;
  }

  const { rating, comment } = parsed.data;

  const [deal] = parsed.data.dealId
    ? await db.select().from(dealsTable).where(eq(dealsTable.id, parsed.data.dealId))
    : await db.select().from(dealsTable).where(eq(dealsTable.offerId, parsed.data.offerId!));

  if (!deal) {
    sendError(res, 404, "not_found", "ไม่พบดีลนี้");
    return;
  }
  const dealId = deal.id;

  const isParty = deal.senderId === uid || deal.receiverId === uid;
  if (!isParty) {
    sendError(res, 403, "forbidden", "ไม่มีสิทธิ์รีวิวดีลนี้");
    return;
  }

  if (deal.stage !== "completed") {
    sendError(res, 409, "invalid_state", "สามารถรีวิวได้เฉพาะดีลที่เสร็จสมบูรณ์แล้ว");
    return;
  }

  const revieweeId = deal.senderId === uid ? deal.receiverId : deal.senderId;

  const existing = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.dealId, dealId), eq(reviewsTable.reviewerId, uid)));
  if (existing.length > 0) {
    sendError(res, 409, "already_reviewed", "คุณรีวิวดีลนี้ไปแล้ว");
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({ dealId, reviewerId: uid, revieweeId, rating, comment })
    .returning();

  const [stats] = await db
    .select({ avg: avg(reviewsTable.rating), total: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.revieweeId, revieweeId));

  if (stats) {
    await db
      .update(profilesTable)
      .set({
        ratingAvg: String(Number(stats.avg || 0).toFixed(2)),
        successfulDealsCount: Number(stats.total),
      })
      .where(eq(profilesTable.id, revieweeId));
  }

  res.status(201).json({ review });
});

router.get("/reviews/:userId", async (req: Request, res: Response) => {
  const userId = String(req.params.userId);
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.revieweeId, userId));
  res.json({ reviews });
});

router.get("/reviews/deal/:dealId/mine", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const dealId = String(req.params.dealId);
  const [review] = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.dealId, dealId), eq(reviewsTable.reviewerId, req.user.id)));
  res.json({ review: review || null });
});

export default router;
