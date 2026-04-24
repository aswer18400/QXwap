import { db, walletsTable, transactionsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { AppError } from "../lib/errors";

type DbOrTx =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getOrCreateWallet(tx: DbOrTx, userId: string) {
  const [existing] = await tx
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId));

  if (existing) return existing;

  const [created] = await tx
    .insert(walletsTable)
    .values({ userId })
    .returning();
  return created;
}

export async function lockFunds(
  tx: DbOrTx,
  {
    userId,
    offerId,
    cashAmount,
    creditAmount,
  }: {
    userId: string;
    offerId: string;
    cashAmount: number;
    creditAmount: number;
  },
) {
  if (cashAmount === 0 && creditAmount === 0) return;

  // FOR UPDATE prevents concurrent offers from spending the same balance
  const [wallet] = await tx
    .select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, userId))
    .for("update");

  if (!wallet) throw new AppError(400, "wallet_not_found", "กระเป๋าเงินไม่พบ");

  if (cashAmount > 0 && Number(wallet.balanceCash) < cashAmount) {
    throw new AppError(409, "insufficient_funds", "ยอดเงินสดไม่เพียงพอ");
  }
  if (creditAmount > 0 && Number(wallet.balanceCredit) < creditAmount) {
    throw new AppError(409, "insufficient_funds", "ยอดเครดิตไม่เพียงพอ");
  }

  await tx
    .update(walletsTable)
    .set({
      balanceCash: sql`${walletsTable.balanceCash} - ${cashAmount}::numeric`,
      balanceCredit: sql`${walletsTable.balanceCredit} - ${creditAmount}::numeric`,
    })
    .where(eq(walletsTable.userId, userId));

  if (cashAmount > 0) {
    await tx.insert(transactionsTable).values({
      userId,
      type: "lock",
      currency: "cash",
      amount: String(cashAmount),
      offerId,
    });
  }
  if (creditAmount > 0) {
    await tx.insert(transactionsTable).values({
      userId,
      type: "lock",
      currency: "credit",
      amount: String(creditAmount),
      offerId,
    });
  }
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
    const column =
      lock.currency === "cash"
        ? walletsTable.balanceCash
        : walletsTable.balanceCredit;

    await tx
      .update(walletsTable)
      .set({ [column.name]: sql`${column} + ${lock.amount}::numeric` })
      .where(eq(walletsTable.userId, userId));

    await tx.insert(transactionsTable).values({
      userId,
      type: "refund",
      currency: lock.currency,
      amount: lock.amount,
      offerId,
    });
  }
}

export async function transferFunds(
  tx: DbOrTx,
  {
    fromUserId,
    toUserId,
    offerId,
  }: { fromUserId: string; toUserId: string; offerId: string },
) {
  // Ensure recipient has a wallet
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
    const column =
      lock.currency === "cash"
        ? walletsTable.balanceCash
        : walletsTable.balanceCredit;

    await tx
      .update(walletsTable)
      .set({ [column.name]: sql`${column} + ${lock.amount}::numeric` })
      .where(eq(walletsTable.userId, toUserId));

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
}
