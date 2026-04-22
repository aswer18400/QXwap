import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { dealsTable } from "./deals";
import { usersTable } from "./auth";

export const conversationsTable = pgTable(
  "conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    dealId: varchar("deal_id")
      .notNull()
      .references(() => dealsTable.id, { onDelete: "cascade" }),
    participantAId: varchar("participant_a_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    participantBId: varchar("participant_b_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lastMessage: text("last_message").notNull().default(""),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("conversations_deal_id_unique").on(table.dealId),
    index("conversations_participant_a_idx").on(table.participantAId),
    index("conversations_participant_b_idx").on(table.participantBId),
    index("conversations_last_message_at_idx").on(table.lastMessageAt),
  ],
);

export const insertConversationSchema = createInsertSchema(conversationsTable).omit(
  {
    id: true,
    lastMessage: true,
    lastMessageAt: true,
    createdAt: true,
    updatedAt: true,
  },
);

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversationsTable.$inferSelect;
