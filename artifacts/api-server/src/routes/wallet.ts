import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";
import { AppError } from "../lib/errors";
import * as WalletService from "../services/wallet.service";

const router: IRouter = Router();

// ─── GET /wallet ─────────────────────────────────────────────
// Returns the authenticated user's wallet (auto-creates if absent)

router.get("/wallet", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const wallet = await WalletService.getOrCreateWallet(db, req.user.id);
  res.json({ wallet });
});

// ─── GET /transactions ───────────────────────────────────────
// Query params: currency, type, offer_id, limit, offset

const listQuerySchema = z.object({
  currency: z.enum(["cash", "credit"]).optional(),
  type: z.enum(["lock", "transfer", "refund"]).optional(),
  offer_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

router.get(
  "/transactions",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(res, "query ไม่ถูกต้อง", parsed.error);
      return;
    }

    const { currency, type, offer_id, limit, offset } = parsed.data;

    const transactions = await WalletService.listTransactions(req.user.id, {
      currency,
      type,
      offerId: offer_id,
      limit,
      offset,
    });

    res.json({ transactions });
  },
);

// ─── POST /wallet/deposit ────────────────────────────────────
// Add funds to the authenticated user's wallet.
// In production this would be gated behind a payment provider webhook;
// for now it is an open endpoint for development / testing.

const depositSchema = z.object({
  cashAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  note: z.string().max(255).optional(),
});

router.post(
  "/wallet/deposit",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = depositSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "ข้อมูลการฝากเงินไม่ถูกต้อง", parsed.error);
      return;
    }

    const { cashAmount, creditAmount, note } = parsed.data;

    if (cashAmount === 0 && creditAmount === 0) {
      sendError(res, 400, "bad_request", "ต้องระบุจำนวนเงินที่จะฝากอย่างน้อยหนึ่งอย่าง");
      return;
    }

    try {
      const wallet = await db.transaction((tx) =>
        WalletService.deposit(tx, {
          userId: req.user!.id,
          cashAmount,
          creditAmount,
          note,
        }),
      );
      res.json({ wallet });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.code, err.message);
        return;
      }
      throw err;
    }
  },
);

// ─── POST /wallet/withdraw ───────────────────────────────────

const withdrawSchema = z.object({
  cashAmount: z.number().min(0).default(0),
  creditAmount: z.number().min(0).default(0),
  note: z.string().max(255).optional(),
});

router.post(
  "/wallet/withdraw",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;

    const parsed = withdrawSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "ข้อมูลการถอนเงินไม่ถูกต้อง", parsed.error);
      return;
    }

    const { cashAmount, creditAmount, note } = parsed.data;

    if (cashAmount === 0 && creditAmount === 0) {
      sendError(res, 400, "bad_request", "ต้องระบุจำนวนที่จะถอนอย่างน้อยหนึ่งอย่าง");
      return;
    }

    try {
      const wallet = await db.transaction((tx) =>
        WalletService.withdraw(tx, {
          userId: req.user!.id,
          cashAmount,
          creditAmount,
          note,
        }),
      );
      res.json({ wallet });
    } catch (err) {
      if (err instanceof AppError) {
        sendError(res, err.statusCode, err.code, err.message);
        return;
      }
      throw err;
    }
  },
);

export default router;
