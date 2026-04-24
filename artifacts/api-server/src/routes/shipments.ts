import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError } from "../lib/http";
import { AppError } from "../lib/errors";
import * as ShipmentService from "../services/shipment.service";

const router: IRouter = Router();

function handleError(res: Response, err: unknown) {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }
  throw err;
}

// ─── POST /shipments/:offer_id/start ─────────────────────────
// Idempotent: creates shipment if not yet created (offer must be in "shipping" status)

router.post(
  "/shipments/:offer_id/start",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const offerId = String(req.params.offer_id);
    try {
      const shipment = await ShipmentService.ensureShipment(offerId);
      res.status(201).json({ shipment });
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /shipments/:id/update-step ─────────────────────────
// Valid stepName values: packed | shipped | delivered

const updateStepSchema = z.object({
  stepName: z.string().min(1),
  note: z.string().max(500).optional(),
});

router.post(
  "/shipments/:id/update-step",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const shipmentId = String(req.params.id);

    const parsed = updateStepSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, "ข้อมูลขั้นตอนไม่ถูกต้อง", parsed.error);
      return;
    }

    try {
      const result = await ShipmentService.addStep(
        shipmentId,
        parsed.data.stepName,
        parsed.data.note,
      );
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── POST /shipments/:id/finish ──────────────────────────────
// Marks shipment finished → transfers products + funds → offer → completed

router.post(
  "/shipments/:id/finish",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const shipmentId = String(req.params.id);

    try {
      const result = await ShipmentService.finishShipment(shipmentId);
      res.json(result);
    } catch (err) {
      handleError(res, err);
    }
  },
);

// ─── GET /shipments/:offer_id ────────────────────────────────

router.get(
  "/shipments/:offer_id",
  requireAuth,
  async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return;
    const offerId = String(req.params.offer_id);

    const shipment = await ShipmentService.getByOfferId(offerId);
    if (!shipment) {
      sendError(res, 404, "not_found", "ไม่พบข้อมูลการจัดส่ง");
      return;
    }

    const steps = await ShipmentService.getSteps(shipment.id);
    res.json({ shipment, steps });
  },
);

export default router;
