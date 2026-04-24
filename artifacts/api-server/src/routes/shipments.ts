import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";
import { db, offersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/authMiddleware";
import { sendError, sendValidationError, handleError } from "../lib/http";
import * as ShipmentService from "../services/shipment.service";

const router: IRouter = Router();

async function assertParticipant(offerId: string, userId: string): Promise<void> {
  const [offer] = await db
    .select({ senderId: offersTable.senderId, receiverId: offersTable.receiverId })
    .from(offersTable)
    .where(eq(offersTable.id, offerId));

  if (!offer) {
    throw Object.assign(new Error("ไม่พบข้อเสนอ"), { statusCode: 404, code: "not_found" });
  }
  if (offer.senderId !== userId && offer.receiverId !== userId) {
    throw Object.assign(new Error("ไม่มีสิทธิ์เข้าถึงการจัดส่งนี้"), {
      statusCode: 403,
      code: "forbidden",
    });
  }
}

async function assertParticipantByShipmentId(shipmentId: string, userId: string): Promise<void> {
  const shipment = await ShipmentService.getById(shipmentId);
  if (!shipment) {
    throw Object.assign(new Error("ไม่พบข้อมูลการจัดส่ง"), { statusCode: 404, code: "not_found" });
  }
  await assertParticipant(shipment.offerId, userId);
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
      await assertParticipant(offerId, req.user.id);
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
      await assertParticipantByShipmentId(shipmentId, req.user.id);
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
      await assertParticipantByShipmentId(shipmentId, req.user.id);
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

    try {
      await assertParticipant(offerId, req.user.id);

      const shipment = await ShipmentService.getByOfferId(offerId);
      if (!shipment) {
        sendError(res, 404, "not_found", "ไม่พบข้อมูลการจัดส่ง");
        return;
      }

      const steps = await ShipmentService.getSteps(shipment.id);
      res.json({ shipment, steps });
    } catch (err) {
      handleError(res, err);
    }
  },
);

export default router;
