


import { pgTable, serial, text, timestamp, integer, doublePrecision, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const itemStatusEnum = pgEnum('item_status', ['AVAILABLE', 'CLAIMED', 'EXPIRED', 'DELETED']);
export const claimStatusEnum = pgEnum('claim_status', ['PENDING', 'COMPLETED', 'CANCELLED']);
export const conversationStatusEnum = pgEnum('conversation_status', ['PENDING', 'ACCEPTED', 'REJECTED']);
export const userRoleEnum = pgEnum('user_role', ['SHOPKEEPER', 'CUSTOMER']);
export const notificationTypeEnum = pgEnum('notification_type', ['FRIEND_REQUEST', 'FRIEND_ACCEPT', 'SYSTEM', 'MESSAGE']);
export const messageTypeEnum = pgEnum('message_type', ['TEXT', 'AUDIO', 'IMAGE']);
export const friendshipStatusEnum = pgEnum('friendship_status', ['PENDING', 'ACCEPTED', 'REJECTED']);

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk ID
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').default('CUSTOMER').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Items Table
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull(), // e.g., 'kg', 'pcs'
  expiryDate: timestamp('expiry_date').notNull(),
  status: itemStatusEnum('status').default('AVAILABLE').notNull(),
  imageUrl: text('image_url'),
  category: text('category').default('Other'),
  originalPrice: doublePrecision('original_price'),
  discountedPrice: doublePrecision('discounted_price'),
  priceCurrency: text('price_currency'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Locations Table
export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').references(() => items.id).notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  address: text('address'),
});

// Claims Table
export const claims = pgTable('claims', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').references(() => items.id).notNull(),
  claimerId: text('claimer_id').references(() => users.id).notNull(),
  status: claimStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Conversations Table
export const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id').references(() => items.id),
  participant1Id: text('participant1_id').references(() => users.id).notNull(),
  participant2Id: text('participant2_id').references(() => users.id).notNull(),
  status: conversationStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Messages Table
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id).notNull(),
  senderId: text('sender_id').references(() => users.id).notNull(),
  content: text('content'),
  type: messageTypeEnum('type').default('TEXT').notNull(),
  mediaUrl: text('media_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Ratings Table
export const ratings = pgTable('ratings', {
  id: serial('id').primaryKey(),
  raterId: text('rater_id').references(() => users.id).notNull(),
  ratedUserId: text('rated_user_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Friendships Table
export const friendships = pgTable('friendships', {
  id: serial('id').primaryKey(),
  requesterId: text('requester_id').references(() => users.id).notNull(),
  addresseeId: text('addressee_id').references(() => users.id).notNull(),
  status: friendshipStatusEnum('status').default('PENDING').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Notifications Table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  relatedId: text('related_id'),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const itemsRelations = relations(items, ({ one, many }) => ({
  user: one(users, {
    fields: [items.userId],
    references: [users.id],
  }),
  location: one(locations, {
    fields: [items.id],
    references: [locations.itemId],
  }),
  claims: many(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  item: one(items, {
    fields: [claims.itemId],
    references: [items.id],
  }),
  claimer: one(users, {
    fields: [claims.claimerId],
    references: [users.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  rater: one(users, {
    fields: [ratings.raterId],
    references: [users.id],
    relationName: 'ratings_given',
  }),
  ratedUser: one(users, {
    fields: [ratings.ratedUserId],
    references: [users.id],
    relationName: 'ratings_received',
  }),
}));

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'friendships_sent',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'friendships_received',
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  item: one(items, {
    fields: [conversations.itemId],
    references: [items.id],
  }),
  participant1: one(users, {
    fields: [conversations.participant1Id],
    references: [users.id],
    relationName: 'participant1',
  }),
  participant2: one(users, {
    fields: [conversations.participant2Id],
    references: [users.id],
    relationName: 'participant2',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));





