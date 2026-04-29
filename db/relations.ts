import { relations } from "drizzle-orm";
import {
  users,
  profiles,
  items,
  itemImages,
  follows,
  bookmarks,
  offers,
  offerItems,
  wallets,
  transactions,
  notifications,
  deals,
  shipments,
  chatConversations,
  chatParticipants,
  chatMessages,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.id] }),
  items: many(items),
  sentFollows: many(follows, { relationName: "follower" }),
  receivedFollows: many(follows, { relationName: "following" }),
  bookmarks: many(bookmarks),
  sentOffers: many(offers, { relationName: "fromUser" }),
  receivedOffers: many(offers, { relationName: "toUser" }),
  wallet: one(wallets, { fields: [users.id], references: [wallets.userId] }),
  transactions: many(transactions),
  notifications: many(notifications),
  dealsBuyer: many(deals, { relationName: "buyer" }),
  dealsSeller: many(deals, { relationName: "seller" }),
  chatParticipants: many(chatParticipants),
  chatMessages: many(chatMessages),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.id], references: [users.id] }),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  owner: one(users, { fields: [items.ownerId], references: [users.id] }),
  images: many(itemImages),
  bookmarks: many(bookmarks),
  offers: many(offers, { relationName: "targetItem" }),
  offerItems: many(offerItems),
  deals: many(deals),
}));

export const itemImagesRelations = relations(itemImages, ({ one }) => ({
  item: one(items, { fields: [itemImages.itemId], references: [items.id] }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, { fields: [follows.followerId], references: [users.id], relationName: "follower" }),
  following: one(users, { fields: [follows.followingId], references: [users.id], relationName: "following" }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, { fields: [bookmarks.userId], references: [users.id] }),
  item: one(items, { fields: [bookmarks.itemId], references: [items.id] }),
}));

export const offersRelations = relations(offers, ({ one, many }) => ({
  fromUser: one(users, { fields: [offers.fromUserId], references: [users.id], relationName: "fromUser" }),
  toUser: one(users, { fields: [offers.toUserId], references: [users.id], relationName: "toUser" }),
  targetItem: one(items, { fields: [offers.targetItemId], references: [items.id], relationName: "targetItem" }),
  offerItems: many(offerItems),
  deal: one(deals),
  shipment: one(shipments),
  chatConversation: one(chatConversations),
}));

export const offerItemsRelations = relations(offerItems, ({ one }) => ({
  offer: one(offers, { fields: [offerItems.offerId], references: [offers.id] }),
  item: one(items, { fields: [offerItems.itemId], references: [items.id] }),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const dealsRelations = relations(deals, ({ one }) => ({
  offer: one(offers, { fields: [deals.offerId], references: [offers.id] }),
  buyer: one(users, { fields: [deals.buyerId], references: [users.id], relationName: "buyer" }),
  seller: one(users, { fields: [deals.sellerId], references: [users.id], relationName: "seller" }),
  item: one(items, { fields: [deals.itemId], references: [items.id] }),
}));

export const shipmentsRelations = relations(shipments, ({ one }) => ({
  offer: one(offers, { fields: [shipments.offerId], references: [offers.id] }),
}));

export const chatConversationsRelations = relations(chatConversations, ({ one, many }) => ({
  offer: one(offers, { fields: [chatConversations.offerId], references: [offers.id] }),
  participants: many(chatParticipants),
  messages: many(chatMessages),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({ one }) => ({
  conversation: one(chatConversations, { fields: [chatParticipants.conversationId], references: [chatConversations.id] }),
  user: one(users, { fields: [chatParticipants.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  conversation: one(chatConversations, { fields: [chatMessages.conversationId], references: [chatConversations.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
}));