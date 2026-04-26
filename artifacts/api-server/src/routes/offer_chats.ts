import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendValidationError, handleError } from "../lib/http";
import * as OfferChatService from "../services/offer_chat.service";

const router: IRouter = Router();

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

const sendMessageSchema = z.object({
  offerId: z.string().min(1),
  message: z.string().trim().min(1).max(4000),
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
      const message = await OfferChatService.sendMessage(
        parsed.data.offerId,
        req.user.id,
        parsed.data.message,
      );
      res.status(201).json({ message });
    } catch (err) {
      handleError(res, err);
    }
  },
);

export default router;
