import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./auth";

export const profilesTable = pgTable("profiles", {
  id: varchar("id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  username: varchar("username"),
  displayName: varchar("display_name"),
  avatarUrl: varchar("avatar_url"),
  bio: text("bio"),
  city: varchar("city").notNull().default("Bangkok"),
  verifiedStatus: boolean("verified_status").notNull().default(false),
  ratingAvg: numeric("rating_avg", { precision: 3, scale: 2 })
    .notNull()
    .default("0"),
  successfulDealsCount: integer("successful_deals_count")
    .notNull()
    .default(0),
  notificationSettings: text("notification_settings").notNull().default("{}"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({
  createdAt: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
