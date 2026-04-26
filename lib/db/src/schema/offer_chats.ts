import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { offersTable } from "./offers";
import { usersTable } from "./auth";

// One chat room per offer, created automatically on offer creation
export const offerChatsTable = pgTable("offer_chats", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id")
    .notNull()
    .unique()
    .references(() => offersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const offerMessagesTable = pgTable(
  "offer_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    chatId: varchar("chat_id")
      .notNull()
      .references(() => offerChatsTable.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("offer_messages_chat_created_idx").on(
      table.chatId,
      table.createdAt,
    ),
  ],
);

export type OfferChat = typeof offerChatsTable.$inferSelect;
export type OfferMessage = typeof offerMessagesTable.$inferSelect;
