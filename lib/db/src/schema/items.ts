import { sql } from "drizzle-orm";
import {
  customType,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType() { return "tsvector"; },
});
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const dealTypeEnum = pgEnum("deal_type", ["swap", "buy", "both"]);
export const itemStatusEnum = pgEnum("item_status", [
  "active",
  "paused",
  "locked",
  "traded",
  "closed",
]);

export const itemsTable = pgTable("items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  conditionLabel: varchar("condition_label").notNull().default("สภาพดี"),
  dealType: dealTypeEnum("deal_type").notNull().default("swap"),
  priceCash: integer("price_cash").notNull().default(0),
  priceCredit: integer("price_credit").notNull().default(0),
  wantedText: text("wanted_text"),
  status: itemStatusEnum("status").notNull().default("active"),
  locationLabel: varchar("location_label").notNull().default("Bangkok"),
  imageEmoji: varchar("image_emoji").notNull().default("📦"),
  imageUrls: text("image_urls").array().notNull().default(sql`'{}'::text[]`),
  searchVector: tsvector("search_vector"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
