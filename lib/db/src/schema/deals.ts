import { sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { offersTable } from "./offers";
import { itemsTable } from "./items";
import { usersTable } from "./auth";

export const dealsTable = pgTable("deals", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id")
    .notNull()
    .references(() => offersTable.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  receiverId: varchar("receiver_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  targetItemId: varchar("target_item_id")
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  stage: varchar("stage").notNull().default("accepted"),
  fulfillmentType: varchar("fulfillment_type").notNull().default("pickup"),
  logisticsConfirmed: boolean("logistics_confirmed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDealSchema = createInsertSchema(dealsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof dealsTable.$inferSelect;
