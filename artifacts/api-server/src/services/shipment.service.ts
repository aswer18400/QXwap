import {
  db,
  offersTable,
  shipmentsTable,
  shipmentStepsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { AppError } from "../lib/errors";
import { completeTrade } from "./offer.service";

type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

const VALID_STEPS = ["packed", "shipped", "delivered"] as const;
type StepName = (typeof VALID_STEPS)[number];

// Step name → shipment status mapping
const STEP_TO_STATUS: Record<StepName, typeof shipmentsTable.$inferSelect["status"]> = {
  packed: "pending",
  shipped: "shipped",
  delivered: "delivered",
};

// ─── Queries ─────────────────────────────────────────────────

export async function getByOfferId(offerId: string) {
  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.offerId, offerId));
  return shipment ?? null;
}

export async function getById(shipmentId: string) {
  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, shipmentId));
  return shipment ?? null;
}

export async function getSteps(shipmentId: string) {
  return db
    .select()
    .from(shipmentStepsTable)
    .where(eq(shipmentStepsTable.shipmentId, shipmentId));
}

// ─── Create ───────────────────────────────────────────────────

export async function ensureShipment(offerId: string) {
  return db.transaction(async (tx) => {
    const [offer] = await tx
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, offerId))
      .for("update");

    if (!offer) throw new AppError(404, "not_found", "ไม่พบข้อเสนอ");
    if (offer.status !== "shipping") {
      throw new AppError(
        409,
        "invalid_state",
        "สามารถเริ่มการจัดส่งได้เฉพาะข้อเสนอที่ทั้งสองฝ่ายยืนยันแล้ว",
      );
    }

    // Idempotent: return existing if already created
    const existing = await getByOfferId(offerId);
    if (existing) return existing;

    const [shipment] = await tx
      .insert(shipmentsTable)
      .values({ offerId, status: "pending" })
      .returning();

    return shipment;
  });
}

// ─── Add step ────────────────────────────────────────────────

export async function addStep(
  shipmentId: string,
  stepName: string,
  note?: string,
) {
  if (!VALID_STEPS.includes(stepName as StepName)) {
    throw new AppError(
      400,
      "invalid_step",
      `ขั้นตอนต้องเป็น: ${VALID_STEPS.join(", ")}`,
    );
  }

  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.id, shipmentId))
      .for("update");

    if (!shipment) throw new AppError(404, "not_found", "ไม่พบข้อมูลการจัดส่ง");
    if (shipment.status === "finished") {
      throw new AppError(409, "invalid_state", "การจัดส่งเสร็จสิ้นแล้ว");
    }

    const [step] = await tx
      .insert(shipmentStepsTable)
      .values({ shipmentId, stepName, note: note ?? null })
      .returning();

    // Advance shipment status if step maps to a higher state
    const nextStatus = STEP_TO_STATUS[stepName as StepName];
    await tx
      .update(shipmentsTable)
      .set({ status: nextStatus })
      .where(eq(shipmentsTable.id, shipmentId));

    return { ...shipment, status: nextStatus, step };
  });
}

// ─── Finish ──────────────────────────────────────────────────

export async function finishShipment(shipmentId: string) {
  return db.transaction(async (tx) => {
    const [shipment] = await tx
      .select()
      .from(shipmentsTable)
      .where(eq(shipmentsTable.id, shipmentId))
      .for("update");

    if (!shipment) throw new AppError(404, "not_found", "ไม่พบข้อมูลการจัดส่ง");
    if (shipment.status === "finished") {
      throw new AppError(409, "invalid_state", "การจัดส่งเสร็จสิ้นแล้วแล้ว");
    }

    // Add finished step
    await tx
      .insert(shipmentStepsTable)
      .values({ shipmentId, stepName: "finished" });

    // Mark shipment done
    const [updatedShipment] = await tx
      .update(shipmentsTable)
      .set({ status: "finished" })
      .where(eq(shipmentsTable.id, shipmentId))
      .returning();

    // Retrieve offer and complete the trade (transfer products + funds)
    const [offer] = await tx
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, shipment.offerId))
      .for("update");

    if (!offer) throw new AppError(404, "not_found", "ไม่พบข้อเสนอที่เชื่อมกับการจัดส่งนี้");

    const tradeResult = await completeTrade(tx, offer);

    return { shipment: updatedShipment, offer: tradeResult.offer };
  });
}
