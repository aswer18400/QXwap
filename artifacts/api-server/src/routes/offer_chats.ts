import { Router, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendValidationError, handleError } from "../lib/http";
import * as OfferChatService from "../services/offer_chat.service";
import { broadcastToUser } from "../lib/sse";

const router = Router();

// ─── GET /chats/:offer_id ─────────────────────────────────────

router.get(
  "/chats/:offer_id",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const offerId = String(req.params.offer_id);
    try {
      const result = await OfferChatService.getChatByOfferId(
        offerId,
        req.user.id,
      );
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /messages ───────────────────────────────────────────

const sendMessageSchema = z
  .object({
    offerId: z.string().min(1),
    message: z.string().trim().max(4000).optional(),
    imageUrl: z.string().max(2000).optional(),
  })
  .refine((d) => (d.message && d.message.length > 0) || d.imageUrl, {
    message: "ต้องส่งข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง",
  });

router.post(
  "/messages",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "ข้อมูลข้อความไม่ถูกต้อง", parsed.error);
      return;
    }

    try {
      const { message, otherPartyId } = await OfferChatService.sendMessage(
        parsed.data.offerId,
        req.user.id,
        parsed.data.message ?? (parsed.data.imageUrl ? "[รูปภาพ]" : ""),
        parsed.data.imageUrl,
      );
      broadcastToUser(otherPartyId, "new_message", {
        offerId: parsed.data.offerId,
        message,
      });
      res.status(201).json({ message });
    } catch (err) {
      handleError(res, err);
    }
  },
);

export default router;
