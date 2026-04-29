import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  jsonb,
  index,
  unique,
  real,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSessions = pgTable("user_sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { withTimezone: true }).notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  username: text("username").unique(),
  city: text("city"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  rating: real("rating").default(0),
  responseTimeMinutes: integer("response_time_minutes"),
  isFeatured: boolean("is_featured").default(false),
  isFastResponder: boolean("is_fast_responder").default(false),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  icon: text("icon"),
});

export const items = pgTable("items", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  condition: text("condition"),
  dealType: text("deal_type").default("swap"),
  priceCash: integer("price_cash").default(0),
  priceCredit: integer("price_credit").default(0),
  openToOffers: boolean("open_to_offers").default(false),
  wantedText: text("wanted_text"),
  wantedTags: text("wanted_tags").array(),
  locationLabel: text("location_label"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  status: text("status").default("active"),
  viewCount: integer("view_count").default(0),
  requestCount: integer("request_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("items_owner_id_idx").on(table.ownerId),
  index("items_category_idx").on(table.category),
  index("items_deal_type_idx").on(table.dealType),
  index("items_status_idx").on(table.status),
  index("items_created_at_idx").on(table.createdAt),
]);

export const itemImages = pgTable("item_images", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const follows = pgTable("follows", {
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("follows_unique").on(table.followerId, table.followingId),
]);

export const bookmarks = pgTable("bookmarks", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique("bookmarks_unique").on(table.userId, table.itemId),
]);

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  fromUserId: uuid("from_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  toUserId: uuid("to_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetItemId: uuid("target_item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  message: text("message"),
  cashAmount: integer("cash_amount").default(0),
  creditAmount: integer("credit_amount").default(0),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const offerItems = pgTable("offer_items", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const wallets = pgTable("wallets", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  creditBalance: integer("credit_balance").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  buyerId: uuid("buyer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sellerId: uuid("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  stage: text("stage"),
  logistics: jsonb("logistics"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
  status: text("status"),
  currentStep: text("current_step"),
  trackingNumber: text("tracking_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  offerId: uuid("offer_id").references(() => offers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chatParticipants = pgTable("chat_participants", {
  conversationId: uuid("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
}, (table) => [
  unique("chat_participants_unique").on(table.conversationId, table.userId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: uuid("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});