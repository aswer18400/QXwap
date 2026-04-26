import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { dealsTable } from "./deals";

export const reviewsTable = pgTable("reviews", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  dealId: varchar("deal_id")
    .notNull()
    .references(() => dealsTable.id, { onDelete: "cascade" }),
  reviewerId: varchar("reviewer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  revieweeId: varchar("reviewee_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Review = typeof reviewsTable.$inferSelect;
