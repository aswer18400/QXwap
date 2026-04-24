import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";
import { offersTable } from "./offers";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "lock",
  "transfer",
  "refund",
]);

export const currencyTypeEnum = pgEnum("currency_type", ["cash", "credit"]);

export const walletsTable = pgTable("wallets", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  balanceCash: numeric("balance_cash", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  balanceCredit: numeric("balance_credit", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const transactionsTable = pgTable(
  "transactions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    currency: currencyTypeEnum("currency").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    offerId: varchar("offer_id").references(() => offersTable.id, {
      onDelete: "set null",
    }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_offer_id_idx").on(table.offerId),
  ],
);

export const insertTransactionSchema = createInsertSchema(
  transactionsTable,
).omit({ id: true, createdAt: true });

export type Wallet = typeof walletsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
