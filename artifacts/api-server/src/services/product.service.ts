import { db, itemsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { AppError } from "../lib/errors";

export type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Validates that every productId in the list:
 *   - exists in the DB
 *   - is owned by ownerId
 *   - is in "active" status (gives a specific error for "locked")
 *
 * Call this inside a transaction before locking to ensure consistent reads.
 */
export async function validateProductsAvailable(
  tx: DbOrTx,
  productIds: string[],
  ownerId: string,
): Promise<void> {
  if (productIds.length === 0) return;

  for (const productId of productIds) {
    const [product] = await tx
      .select({
        id: itemsTable.id,
        title: itemsTable.title,
        ownerId: itemsTable.ownerId,
        status: itemsTable.status,
      })
      .from(itemsTable)
      .where(eq(itemsTable.id, productId));

    if (!product) {
      throw new AppError(404, "not_found", `ไม่พบสินค้า: ${productId}`);
    }
    if (product.ownerId !== ownerId) {
      throw new AppError(
        403,
        "forbidden",
        `สินค้า "${product.title}" ไม่ใช่ของคุณ`,
      );
    }
    if (product.status === "locked") {
      throw new AppError(
        409,
        "product_locked",
        `สินค้า "${product.title}" กำลังอยู่ในระหว่างการแลกเปลี่ยนอื่น`,
      );
    }
    if (product.status === "traded") {
      throw new AppError(
        409,
        "product_traded",
        `สินค้า "${product.title}" ถูกแลกเปลี่ยนไปแล้ว`,
      );
    }
    if (product.status !== "active") {
      throw new AppError(
        409,
        "invalid_state",
        `สินค้า "${product.title}" ไม่พร้อมสำหรับการแลกเปลี่ยน (สถานะ: ${product.status})`,
      );
    }
  }
}

/**
 * Sets all listed products to "locked".
 * Uses a single UPDATE with IN clause for efficiency.
 */
export async function lockProducts(
  tx: DbOrTx,
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) return;

  await tx
    .update(itemsTable)
    .set({ status: "locked" })
    .where(inArray(itemsTable.id, productIds));
}

/**
 * Restores all listed products back to "active".
 * Called on offer reject or cancel.
 */
export async function unlockProducts(
  tx: DbOrTx,
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) return;

  await tx
    .update(itemsTable)
    .set({ status: "active" })
    .where(inArray(itemsTable.id, productIds));
}

/**
 * Marks all listed products as "traded" and transfers ownership to newOwnerId.
 * Called when both sides confirm and the trade completes.
 */
export async function tradeProducts(
  tx: DbOrTx,
  productIds: string[],
  newOwnerId: string,
): Promise<void> {
  if (productIds.length === 0) return;

  await tx
    .update(itemsTable)
    .set({ status: "traded", ownerId: newOwnerId })
    .where(inArray(itemsTable.id, productIds));
}
