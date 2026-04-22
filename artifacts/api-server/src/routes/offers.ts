import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  offersTable,
  itemsTable,
  dealsTable,
  notificationsTable,
  insertOfferSchema,
} from "@workspace/db";
import { desc, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";

const router: IRouter = Router();

router.get("/offers/mine", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const uid = req.user.id;
  const rows = await db
    .select({
      offer: offersTable,
      itemTitle: itemsTable.title,
    })
    .from(offersTable)
    .leftJoin(itemsTable, eq(offersTable.targetItemId, itemsTable.id))
    .where(or(eq(offersTable.senderId, uid), eq(offersTable.receiverId, uid)))
    .orderBy(desc(offersTable.createdAt));

  res.json({
    offers: rows.map((r) => ({
      ...r.offer,
      item: { title: r.itemTitle },
    })),
  });
});

const createOfferSchema = insertOfferSchema.pick({
  targetItemId: true,
  message: true,
  offeredCash: true,
  offeredCredit: true,
});

router.post("/offers", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = createOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "ข้อมูลข้อเสนอไม่ครบ" });
    return;
  }
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, parsed.data.targetItemId));
  if (!item) {
    res.status(404).json({ error: "ไม่พบสินค้า" });
    return;
  }
  if (item.ownerId === req.user.id) {
    res.status(400).json({ error: "ไม่สามารถขอแลกสินค้าของตัวเอง" });
    return;
  }
  const [created] = await db
    .insert(offersTable)
    .values({
      targetItemId: parsed.data.targetItemId,
      senderId: req.user.id,
      receiverId: item.ownerId,
      message: parsed.data.message ?? "",
      offeredCash: parsed.data.offeredCash ?? 0,
      offeredCredit: parsed.data.offeredCredit ?? 0,
    })
    .returning();

  await db.insert(notificationsTable).values({
    userId: item.ownerId,
    actorId: req.user.id,
    type: "offer_received",
    title: "คุณได้รับข้อเสนอใหม่",
    body: item.title,
    offerId: created.id,
  });

  res.json({ offer: created });
});

const patchSchema = z.object({
  status: z.enum(["accepted", "rejected", "canceled"]),
});

router.patch(
  "/offers/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "status ไม่ถูกต้อง" });
      return;
    }
    const [offer] = await db
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, String(req.params.id)));
    if (!offer) {
      res.status(404).json({ error: "ไม่พบข้อเสนอ" });
      return;
    }
    const isReceiver = offer.receiverId === req.user.id;
    const isSender = offer.senderId === req.user.id;
    if (parsed.data.status === "canceled" && !isSender) {
      res.status(403).json({ error: "เฉพาะผู้ส่งเท่านั้นที่ยกเลิกได้" });
      return;
    }
    if (parsed.data.status !== "canceled" && !isReceiver) {
      res
        .status(403)
        .json({ error: "เฉพาะผู้รับข้อเสนอเท่านั้นที่ตอบได้" });
      return;
    }
    if (offer.status !== "pending") {
      res
        .status(409)
        .json({ error: "ข้อเสนอนี้ถูกตอบไปแล้ว ไม่สามารถเปลี่ยนสถานะได้" });
      return;
    }

    const [updated] = await db
      .update(offersTable)
      .set({ status: parsed.data.status })
      .where(eq(offersTable.id, offer.id))
      .returning();

    if (parsed.data.status === "accepted") {
      const [deal] = await db
        .insert(dealsTable)
        .values({
          offerId: offer.id,
          senderId: offer.senderId,
          receiverId: offer.receiverId,
          targetItemId: offer.targetItemId,
        })
        .returning();

      await db.insert(notificationsTable).values({
        userId: offer.senderId,
        actorId: req.user.id,
        type: "offer_accepted",
        title: "ข้อเสนอของคุณถูกตอบรับ",
        offerId: offer.id,
        dealId: deal.id,
      });
    }

    if (parsed.data.status === "rejected") {
      await db.insert(notificationsTable).values({
        userId: offer.senderId,
        actorId: req.user.id,
        type: "offer_rejected",
        title: "ข้อเสนอของคุณถูกปฏิเสธ",
        offerId: offer.id,
      });
    }

    res.json({ offer: updated });
  },
);

export default router;
