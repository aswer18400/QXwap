import { db, itemsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { AppError } from "../lib/errors";

export type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function validateProductsAvailable(
  tx: DbOrTx,
  productIds: string[],
  ownerId: string,
): Promise<void> {
  if (productIds.length === 0) return;

  // Sort IDs before acquiring locks — consistent ordering prevents deadlocks
  // when two concurrent transactions lock overlapping product sets.
  const sortedIds = [...productIds].sort();

  for (const productId of sortedIds) {
    const [product] = await tx
      .select({
        id: itemsTable.id,
        title: itemsTable.title,
        ownerId: itemsTable.ownerId,
        status: itemsTable.status,
      })
      .from(itemsTable)
      .where(eq(itemsTable.id, productId))
      .for("update"); // Serialize concurrent offers that include the same product

    if (!product) {
      throw new AppError(404, "not_found", `ไม่พบสินค้า: ${productId}`);
    }
    if (product.ownerId !== ownerId) {
      throw new AppError(403, "forbidden", `สินค้า "${product.title}" ไม่ใช่ของคุณ`);
    }
    if (product.status === "locked") {
      throw new AppError(
        409,
        "product_locked",
        `สินค้า "${product.title}" กำลังอยู่ในระหว่างการแลกเปลี่ยนอื่น`,
      );
    }
    if (product.status === "traded") {
      throw new AppError(409, "product_traded", `สินค้า "${product.title}" ถูกแลกเปลี่ยนไปแล้ว`);
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

export async function lockProducts(tx: DbOrTx, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  await tx.update(itemsTable).set({ status: "locked" }).where(inArray(itemsTable.id, productIds));
}

export async function unlockProducts(tx: DbOrTx, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  await tx.update(itemsTable).set({ status: "active" }).where(inArray(itemsTable.id, productIds));
}

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
