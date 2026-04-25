import { db, walletsTable, transactionsTable } from "@workspace/db";
import { and, desc, eq, sql } from "drizzle-orm";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";

export type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Read ─────────────────────────────────────────────────────

export async function getOrCreateWallet(tx: DbOrTx, userId: string) {
  // Atomic upsert — prevents the race where two concurrent requests both see
  // no row and both try to INSERT, causing a unique-constraint violation.
  const [wallet] = await tx
    .insert(walletsTable)
    .values({ userId })
    .onConflictDoUpdate({
      target: walletsTable.userId,
      set: { userId: sql`excluded.user_id` },
    })
    .returning();
  return wallet!;
}

export interface ListTransactionsFilters {
  currency?: "cash" | "credit";
  type?: "lock" | "transfer" | "refund";
  offerId?: string;
  limit?: number;
  offset?: number;
}

export async function listTransactions(
  userId: string,
  filters: ListTransactionsFilters = {},
) {
  const conditions = [eq(transactionsTable.userId, userId)];

  if (filters.currency) conditions.push(eq(transactionsTable.currency, filters.currency));
  if (filters.type) conditions.push(eq(transactionsTable.type, filters.type));
  if (filters.offerId) conditions.push(eq(transactionsTable.offerId, filters.offerId));

  return db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(Math.min(filters.limit ?? 50, 200))
    .offset(filters.offset ?? 0);
}

// ─── Mutations ────────────────────────────────────────────────

export async function deposit(
  tx: DbOrTx,
  {
    userId,
    cashAmount = 0,
    creditAmount = 0,
    note,
  }: {
    userId: string;
    cashAmount?: number;
    creditAmount?: number;
    note?: string;
  },
) {
  if (cashAmount <= 0 && creditAmount <= 0) {
    throw new AppError(400, "bad_request", "ต้องระบุจำนวนเงินที่จะฝากอย่างน้อยหนึ่งอย่าง");
  }

  await getOrCreateWallet(tx, userId);

  if (cashAmount > 0) {
    await tx
      .update(walletsTable)
      .set({ balanceCash: sql`${walletsTable.balanceCash} + ${cashAmount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "transfer",
      currency: "cash",
      amount: String(cashAmount),
      note: note ?? "deposit",
    });
  }

  if (creditAmount > 0) {
    await tx
      .update(walletsTable)
      .set({ balanceCredit: sql`${walletsTable.balanceCredit} + ${creditAmount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "transfer",
      currency: "credit",
      amount: String(creditAmount),
      note: note ?? "deposit",
    });
  }

  const wallet = await getOrCreateWallet(tx, userId);
  logger.info({ userId, cashAmount, creditAmount }, "wallet.deposit");
  return wallet;
}

export async function withdraw(
  tx: DbOrTx,
  {
    userId,
    cashAmount = 0,
    creditAmount = 0,
    note,
  }: {
    userId: string;
    cashAmount?: number;
    creditAmount?: number;
    note?: string;
  },
) {
  if (cashAmount <= 0 && creditAmount <= 0) {
    throw new AppError(400, "bad_request", "ต้องระบุจำนวนที่จะถอนอย่างน้อยหนึ่งอย่าง");
  }

  const wallet = await getOrCreateWallet(tx, userId);

  if (cashAmount > 0) {
    if (Number(wallet.balanceCash) < cashAmount) {
      throw new AppError(400, "insufficient_funds", "ยอดเงินสดไม่เพียงพอ");
    }
    await tx
      .update(walletsTable)
      .set({ balanceCash: sql`${walletsTable.balanceCash} - ${cashAmount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "transfer",
      currency: "cash",
      amount: String(cashAmount),
      note: note ?? "withdraw",
    });
  }

  if (creditAmount > 0) {
    if (Number(wallet.balanceCredit) < creditAmount) {
      throw new AppError(400, "insufficient_funds", "ยอดเครดิตไม่เพียงพอ");
    }
    await tx
      .update(walletsTable)
      .set({ balanceCredit: sql`${walletsTable.balanceCredit} - ${creditAmount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "transfer",
      currency: "credit",
      amount: String(creditAmount),
      note: note ?? "withdraw",
    });
  }

  const updated = await getOrCreateWallet(tx, userId);
  logger.info({ userId, cashAmount, creditAmount }, "wallet.withdraw");
  return updated;
}

export async function lockFunds(
  tx: DbOrTx,
  {
    userId,
    offerId,
    cashAmount,
    creditAmount,
  }: { userId: string; offerId: string; cashAmount: number; creditAmount: number },
) {
  if (cashAmount === 0 && creditAmount === 0) return;

  // FOR UPDATE prevents two concurrent offers spending the same balance
  const [wallet] = await tx
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .for("update");

  if (!wallet) throw new AppError(400, "wallet_not_found", "ไม่พบกระเป๋าเงิน");

  if (cashAmount > 0 && Number(wallet.balanceCash) < cashAmount) {
    throw new AppError(409, "insufficient_funds", "ยอดเงินสดไม่เพียงพอ");
  }
  if (creditAmount > 0 && Number(wallet.balanceCredit) < creditAmount) {
    throw new AppError(409, "insufficient_funds", "ยอดเครดิตไม่เพียงพอ");
  }

  if (cashAmount > 0) {
    await tx
      .update(walletsTable)
      .set({ balanceCash: sql`${walletsTable.balanceCash} - ${cashAmount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "lock",
      currency: "cash",
      amount: String(cashAmount),
      offerId,
    });
  }

  if (creditAmount > 0) {
    await tx
      .update(walletsTable)
      .set({ balanceCredit: sql`${walletsTable.balanceCredit} - ${creditAmount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "lock",
      currency: "credit",
      amount: String(creditAmount),
      offerId,
    });
  }

  logger.info({ userId, offerId, cashAmount, creditAmount }, "wallet.funds_locked");
}

export async function releaseFunds(
  tx: DbOrTx,
  { userId, offerId }: { userId: string; offerId: string },
) {
  const locks = await tx
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, userId),
        eq(transactionsTable.offerId, offerId),
        eq(transactionsTable.type, "lock"),
      ),
    );

  for (const lock of locks) {
    if (lock.currency === "cash") {
      await tx
        .update(walletsTable)
        .set({ balanceCash: sql`${walletsTable.balanceCash} + ${lock.amount}::numeric` })
        .where(eq(walletsTable.userId, userId));
    } else {
      await tx
        .update(walletsTable)
        .set({ balanceCredit: sql`${walletsTable.balanceCredit} + ${lock.amount}::numeric` })
        .where(eq(walletsTable.userId, userId));
    }

    await tx.insert(transactionsTable).values({
      userId,
      type: "refund",
      currency: lock.currency,
      amount: lock.amount,
      offerId,
    });
  }

  if (locks.length > 0) {
    logger.info({ userId, offerId, count: locks.length }, "wallet.funds_released");
  }
}

export async function transferFunds(
  tx: DbOrTx,
  { fromUserId, toUserId, offerId }: { fromUserId: string; toUserId: string; offerId: string },
) {
  await getOrCreateWallet(tx, toUserId);

  const locks = await tx
    .select()
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.userId, fromUserId),
        eq(transactionsTable.offerId, offerId),
        eq(transactionsTable.type, "lock"),
      ),
    );

  for (const lock of locks) {
    if (lock.currency === "cash") {
      await tx
        .update(walletsTable)
        .set({ balanceCash: sql`${walletsTable.balanceCash} + ${lock.amount}::numeric` })
        .where(eq(walletsTable.userId, toUserId));
    } else {
      await tx
        .update(walletsTable)
        .set({ balanceCredit: sql`${walletsTable.balanceCredit} + ${lock.amount}::numeric` })
        .where(eq(walletsTable.userId, toUserId));
    }

    await tx.insert(transactionsTable).values({
      userId: fromUserId,
      type: "transfer",
      currency: lock.currency,
      amount: lock.amount,
      offerId,
      note: `transfer_to:${toUserId}`,
    });

    await tx.insert(transactionsTable).values({
      userId: toUserId,
      type: "transfer",
      currency: lock.currency,
      amount: lock.amount,
      offerId,
      note: `received_from:${fromUserId}`,
    });
  }

  if (locks.length > 0) {
    logger.info({ fromUserId, toUserId, offerId, count: locks.length }, "wallet.funds_transferred");
  }
}
