import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { dealsTable } from "./deals";
import { usersTable } from "./auth";

export const disputesTable = pgTable("disputes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  reporterId: varchar("reporter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  reportedUserId: varchar("reported_user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  dealId: varchar("deal_id").references(() => dealsTable.id, {
    onDelete: "set null",
  }),
  reason: varchar("reason").notNull(),
  detail: text("detail"),
  status: varchar("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Dispute = typeof disputesTable.$inferSelect;
