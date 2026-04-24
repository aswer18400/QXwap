import { sql } from "drizzle-orm";
import {
  boolean,
  index,
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
import { dealsTable } from "./deals";

export const notificationTypeEnum = pgEnum("notification_type", [
  "offer_received",
  "offer_accepted",
  "offer_rejected",
  "offer_cancelled",
  "offer_confirmed",
  "deal_stage_updated",
  "shipment_updated",
  "trade_completed",
]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    actorId: varchar("actor_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title").notNull(),
    body: text("body"),
    offerId: varchar("offer_id").references(() => offersTable.id, {
      onDelete: "set null",
    }),
    dealId: varchar("deal_id").references(() => dealsTable.id, {
      onDelete: "set null",
    }),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const insertNotificationSchema = createInsertSchema(
  notificationsTable,
).omit({
  id: true,
  isRead: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
