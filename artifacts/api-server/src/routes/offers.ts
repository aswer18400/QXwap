import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendValidationError, handleError } from "../lib/http";
import * as OfferService from "../services/offer.service";

const router: IRouter = Router();

const offerIdSchema = z.object({ id: z.uuid() });

// Run expiry sweep every 30 minutes in-process
setInterval(async () => {
  try {
    const n = await OfferService.expireStaleOffers();
    if (n > 0) console.log(`[offers] expired ${n} stale offers`);
  } catch { /* ignore */ }
}, 30 * 60 * 1000);

// ─── GET /offers  (all mine) ─────────────────────────────────

router.get("/offers", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const rows = await OfferService.listOffers(req.user.id, "mine");
  res.json({ offers: rows });
});

router.get(
  "/offers/sent",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const rows = await OfferService.listOffers(req.user.id, "sent");
    res.json({ offers: rows });
  },
);

router.get(
  "/offers/received",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const rows = await OfferService.listOffers(req.user.id, "received");
    res.json({ offers: rows });
  },
);

// ─── GET /offers/:id ─────────────────────────────────────────

router.get(
  "/offers/:id",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const p = offerIdSchema.safeParse(req.params);
    if (!p.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", p.error);
      return;
    }
    try {
      const offer = await OfferService.getOffer(p.data.id, req.user.id);
      res.json({ offer });
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /offers ────────────────────────────────────────────

const offerItemSchema = z
  .object({
    productId: z.uuid().optional(),
    cashAmount: z.number().min(0).default(0),
    creditAmount: z.number().min(0).default(0),
  })
  .refine(
    (v) => v.productId !== undefined || v.cashAmount > 0 || v.creditAmount > 0,
    { message: "แต่ละรายการต้องระบุสินค้า เงินสด หรือเครดิตอย่างน้อยหนึ่งอย่าง" },
  );

const createOfferSchema = z
  .object({
    targetItemId: z.uuid(),
    message: z.string().max(2000).optional(),
    items: z.array(offerItemSchema).default([]),
  })
  .refine(
    (v) => v.items.length > 0 || Boolean(v.message?.trim()),
    { message: "ระบุสินค้า เงินสด เครดิต หรือข้อความข้อเสนออย่างน้อยหนึ่งอย่าง" },
  );

router.post("/offers", requireAuth, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return;
  const parsed = createOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    sendValidationError(res, "ข้อมูลข้อเสนอไม่ครบ", parsed.error);
    return;
  }
  try {
    const offer = await OfferService.createOffer(req.user.id, parsed.data);
    res.status(201).json({ offer });
  } catch (err) {
    handleError(res, err);
  }
});

// ─── POST /offers/:id/accept ─────────────────────────────────

router.post(
  "/offers/:id/accept",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const p = offerIdSchema.safeParse(req.params);
    if (!p.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", p.error);
      return;
    }
    try {
      const offer = await OfferService.acceptOffer(p.data.id, req.user.id);
      res.json({ offer });
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /offers/:id/reject ─────────────────────────────────

router.post(
  "/offers/:id/reject",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const p = offerIdSchema.safeParse(req.params);
    if (!p.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", p.error);
      return;
    }
    try {
      const offer = await OfferService.rejectOffer(p.data.id, req.user.id);
      res.json({ offer });
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /offers/:id/cancel ─────────────────────────────────

router.post(
  "/offers/:id/cancel",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const p = offerIdSchema.safeParse(req.params);
    if (!p.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", p.error);
      return;
    }
    try {
      const offer = await OfferService.cancelOffer(p.data.id, req.user.id);
      res.json({ offer });
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /offers/:id/counter ────────────────────────────────

const counterOfferItemSchema = z
  .object({
    productId: z.uuid().optional(),
    cashAmount: z.number().min(0).default(0),
    creditAmount: z.number().min(0).default(0),
  })
  .refine(
    (v) => v.productId !== undefined || v.cashAmount > 0 || v.creditAmount > 0,
    { message: "แต่ละรายการต้องระบุสินค้า เงินสด หรือเครดิตอย่างน้อยหนึ่งอย่าง" },
  );

const counterOfferSchema = z
  .object({
    message: z.string().max(2000).optional(),
    items: z.array(counterOfferItemSchema).default([]),
  })
  .refine(
    (v) => v.items.length > 0 || Boolean(v.message?.trim()),
    { message: "ระบุสินค้า เงินสด เครดิต หรือข้อความข้อเสนออย่างน้อยหนึ่งอย่าง" },
  );

router.post(
  "/offers/:id/counter",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const p = offerIdSchema.safeParse(req.params);
    if (!p.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", p.error);
      return;
    }
    const body = counterOfferSchema.safeParse(req.body);
    if (!body.success) {
      sendValidationError(res, "ข้อมูลข้อเสนอกลับไม่ครบ", body.error);
      return;
    }
    try {
      const result = await OfferService.counterOffer(
        p.data.id,
        req.user.id,
        body.data,
      );
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /offers/:id/confirm ────────────────────────────────

router.post(
  "/offers/:id/confirm",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const p = offerIdSchema.safeParse(req.params);
    if (!p.success) {
      sendValidationError(res, "รหัสข้อเสนอไม่ถูกต้อง", p.error);
      return;
    }
    try {
      const result = await OfferService.confirmOffer(p.data.id, req.user.id);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

export default router;
