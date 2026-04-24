import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { itemsTable } from "./items";
import { usersTable } from "./auth";

export const offerStatusEnum = pgEnum("offer_status", [
  "pending",
  "accepted",
  "rejected",
  "canceled",
  "shipping",
  "completed",
]);

export const offersTable = pgTable("offers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  targetItemId: varchar("target_item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  status: offerStatusEnum("status").notNull().default("pending"),
  // denormalised totals kept for backward-compat with deals route
  offeredCash: numeric("offered_cash", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  offeredCredit: numeric("offered_credit", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// Individual components of an offer: each row is one product OR one money chunk
export const offerItemsTable = pgTable(
  "offer_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    offerId: varchar("offer_id")
      .notNull()
      .references(() => offersTable.id, { onDelete: "cascade" }),
    productId: varchar("product_id").references(() => itemsTable.id, {
      onDelete: "set null",
    }),
    cashAmount: numeric("cash_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    creditAmount: numeric("credit_amount", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
  },
  (table) => [index("offer_items_offer_id_idx").on(table.offerId)],
);

// One row per user who confirmed — UNIQUE prevents double-confirm at DB level
export const offerConfirmationsTable = pgTable(
  "offer_confirmations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    offerId: varchar("offer_id")
      .notNull()
      .references(() => offersTable.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("offer_confirmations_offer_user_unique").on(
      table.offerId,
      table.userId,
    ),
  ],
);

export const insertOfferSchema = createInsertSchema(offersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});
export const insertOfferItemSchema = createInsertSchema(offerItemsTable).omit({
  id: true,
});

export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offersTable.$inferSelect;
export type OfferItem = typeof offerItemsTable.$inferSelect;
export type OfferConfirmation = typeof offerConfirmationsTable.$inferSelect;
