import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  offersTable,
  itemsTable,
  dealsTable,
  insertOfferSchema,
} from "@workspace/db";
import { desc, eq, or } from "drizzle-orm";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";

const router: IRouter = Router();
const offerIdParamSchema = z.object({
  id: z.uuid(),
});

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
    sendValidationError(res, "ข้อมูลข้อเสนอไม่ครบ", parsed.error);
    return;
  }
  const [item] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, parsed.data.targetItemId));
  if (!item) {
    sendError(res, 404, "not_found", "ไม่พบสินค้า");
    return;
  }
  if (item.ownerId === req.user.id) {
    sendError(res, 400, "invalid_state", "ไม่สามารถขอแลกสินค้าของตัวเอง");
    return;
  }
  if (item.status !== "active") {
    sendError(res, 409, "invalid_state", "ไม่สามารถส่งข้อเสนอให้สินค้าที่ไม่พร้อมแลก");
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
    const paramsParsed = offerIdParamSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", paramsParsed.error);
      return;
    }
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "status ไม่ถูกต้อง", parsed.error);
      return;
    }
    const [offer] = await db
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, paramsParsed.data.id));
    if (!offer) {
      sendError(res, 404, "not_found", "ไม่พบข้อเสนอ");
      return;
    }
    const [item] = await db
      .select()
      .from(itemsTable)
      .where(eq(itemsTable.id, offer.targetItemId));
    if (!item) {
      sendError(res, 404, "not_found", "ไม่พบสินค้า");
      return;
    }
    const isReceiver = offer.receiverId === req.user.id;
    const isSender = offer.senderId === req.user.id;
    if (parsed.data.status === "canceled" && !isSender) {
      sendError(res, 403, "forbidden", "เฉพาะผู้ส่งเท่านั้นที่ยกเลิกได้");
      return;
    }
    if (parsed.data.status !== "canceled" && !isReceiver) {
      sendError(res, 403, "forbidden", "เฉพาะผู้รับข้อเสนอเท่านั้นที่ตอบได้");
      return;
    }
    if (offer.status !== "pending") {
      sendError(
        res,
        409,
        "invalid_state",
        "ข้อเสนอนี้ถูกตอบไปแล้ว ไม่สามารถเปลี่ยนสถานะได้",
      );
      return;
    }
    if (parsed.data.status === "accepted" && item.status !== "active") {
      sendError(
        res,
        409,
        "invalid_state",
        "ไม่สามารถตอบรับข้อเสนอของสินค้าที่ไม่พร้อมแลก",
      );
      return;
    }

    const [updated] = await db
      .update(offersTable)
      .set({ status: parsed.data.status })
      .where(eq(offersTable.id, offer.id))
      .returning();

    if (parsed.data.status === "accepted") {
      await db.insert(dealsTable).values({
        offerId: offer.id,
        senderId: offer.senderId,
        receiverId: offer.receiverId,
        targetItemId: offer.targetItemId,
      });
    }

    res.json({ offer: updated });
  },
);

export default router;
