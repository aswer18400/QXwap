import { pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { index } from "drizzle-orm/pg-core";
import { usersTable } from "./auth";
import { itemsTable } from "./items";

export const bookmarksTable = pgTable(
  "bookmarks",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    itemId: varchar("item_id")
      .notNull()
      .references(() => itemsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemId] }),
    index("bookmarks_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export type Bookmark = typeof bookmarksTable.$inferSelect;
