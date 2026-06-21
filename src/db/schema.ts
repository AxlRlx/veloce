import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// 1. Profiles Table
export const profiles = pgTable('profiles', {
  id: text('id').primaryKey(), // Firebase Auth uid
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  role: text('role').default('user').notNull(), // 'user', 'dealer', 'admin'
  subscriptionTier: text('subscription_tier').default('free').notNull(), // 'free', 'veloce_gt', 'dealer_basic', 'dealer_pro'
  kycStatus: text('kyc_status').default('unverified').notNull(), // 'unverified', 'pending', 'verified', 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Vehicles Table
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year').notNull(),
  price: integer('price').notNull(),
  rentalPriceDaily: integer('rental_price_daily').notNull(),
  location: text('location').notNull(),
  description: text('description').notNull(),
  mileage: integer('mileage').notNull(),
  transmission: text('transmission').notNull(),
  fuelType: text('fuel_type').notNull(),
  horsepower: integer('horsepower').notNull(),
  category: text('category').notNull(),
  status: text('status').default('draft').notNull(), // 'draft', 'pending_review', 'active', 'rejected', 'sold', 'rented'
  images: text('images').array().notNull(), // array of strings
  vehicleType: text('vehicle_type').default('car').notNull(), // 'car', 'motorcycle'
  listingSource: text('listing_source').default('user_submitted').notNull(), // 'user_submitted', 'dealer_submitted', 'admin_seed', 'demo'
  authenticityStatus: text('authenticity_status').default('unverified').notNull(), // 'unverified', 'pending_review', 'verified', 'rejected'
  imagePolicyStatus: text('image_policy_status').default('missing_required_images').notNull(), // 'missing_required_images', 'pending_review', 'approved', 'rejected'
  isDemoListing: boolean('is_demo_listing').default(false).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  reviewNotes: text('review_notes'),
  vinLast6: text('vin_last_6'),
  registrationDocumentUploaded: text('registration_document_uploaded'),
  insuranceDocumentUploaded: text('insurance_document_uploaded'),
  proofPhotoUploaded: text('proof_photo_uploaded'),
  odometerPhotoUploaded: text('odometer_photo_uploaded'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Vehicle Likes Table
export const vehicleLikes = pgTable('vehicle_likes', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  vehicleId: text('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. Conversations Table
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'set null' }),
  userOne: text('user_one')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  userTwo: text('user_two')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Messages Table
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .references(() => conversations.id, { onDelete: 'cascade' })
    .notNull(),
  senderId: text('sender_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  readAt: timestamp('read_at'),
});

// 6. Bookings Table
export const bookings = pgTable('bookings', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  renterId: text('renter_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  ownerId: text('owner_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  startDate: text('start_date').notNull(), // format YYYY-MM-DD
  endDate: text('end_date').notNull(), // format YYYY-MM-DD
  totalPrice: integer('total_price').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'confirmed', 'cancelled', 'completed', 'rejected'
  paymentStatus: text('payment_status').default('unpaid').notNull(), // 'unpaid', 'pending', 'paid', 'refunded', 'failed'
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. Reviews Table
export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  reviewerId: text('reviewer_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  reviewedUserId: text('reviewed_user_id')
    .references(() => profiles.id, { onDelete: 'cascade' }),
  vehicleId: text('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Community Events Table
export const communityEvents = pgTable('community_events', {
  id: text('id').primaryKey(),
  creatorId: text('creator_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location').notNull(),
  eventDate: text('event_date').notNull(), // YYYY-MM-DD format
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. Subscriptions Table
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  stripeSubscriptionId: text('stripe_subscription_id').notNull(),
  tier: text('tier').notNull(),
  status: text('status').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 10. Admin Reports Table
export const adminReports = pgTable('admin_reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  targetType: text('target_type').notNull(), // 'vehicle', 'profile', 'message', 'event'
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'resolved'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Vehicle Images Table
export const vehicleImages = pgTable('vehicle_images', {
  id: text('id').primaryKey(),
  vehicleId: text('vehicle_id')
    .references(() => vehicles.id, { onDelete: 'cascade' })
    .notNull(),
  ownerId: text('owner_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  storagePath: text('storage_path').notNull(),
  publicUrl: text('public_url'),
  source: text('source').default('user_upload').notNull(), // 'user_upload', 'admin_seed', 'demo_placeholder'
  status: text('status').default('pending_review').notNull(), // 'pending_review', 'approved', 'rejected'
  moderationReason: text('moderation_reason'),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 12. Admin Action Logs Table
export const adminActionLogs = pgTable('admin_action_logs', {
  id: text('id').primaryKey(),
  adminId: text('admin_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Demo Payment Events Table
export const demoPaymentEvents = pgTable('demo_payment_events', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => profiles.id, { onDelete: 'cascade' })
    .notNull(),
  bookingId: text('booking_id')
    .references(() => bookings.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id')
    .references(() => subscriptions.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  demoStatus: text('demo_status').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Payment Provider Events Table
export const paymentProviderEvents = pgTable('payment_provider_events', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  eventType: text('event_type').notNull(),
  externalEventId: text('external_event_id'),
  rawPayload: text('raw_payload'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ---- RELATIONS ----

export const profilesRelations = relations(profiles, ({ many }) => ({
  vehicles: many(vehicles),
  vehicleLikes: many(vehicleLikes),
  bookingsAsRenter: many(bookings, { relationName: 'renter_bookings' }),
  bookingsAsOwner: many(bookings, { relationName: 'owner_bookings' }),
  reviewsGiven: many(reviews, { relationName: 'written_reviews' }),
  reviewsReceived: many(reviews, { relationName: 'user_reviews' }),
  communityEvents: many(communityEvents),
  subscriptions: many(subscriptions),
  adminReports: many(adminReports),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(profiles, {
    fields: [vehicles.ownerId],
    references: [profiles.id],
  }),
  likes: many(vehicleLikes),
  bookings: many(bookings),
  reviews: many(reviews),
  conversations: many(conversations),
}));

export const vehicleLikesRelations = relations(vehicleLikes, ({ one }) => ({
  user: one(profiles, {
    fields: [vehicleLikes.userId],
    references: [profiles.id],
  }),
  vehicle: one(vehicles, {
    fields: [vehicleLikes.vehicleId],
    references: [vehicles.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [conversations.vehicleId],
    references: [vehicles.id],
  }),
  user1: one(profiles, {
    fields: [conversations.userOne],
    references: [profiles.id],
    relationName: 'user_one',
  }),
  user2: one(profiles, {
    fields: [conversations.userTwo],
    references: [profiles.id],
    relationName: 'user_two',
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(profiles, {
    fields: [messages.senderId],
    references: [profiles.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [bookings.vehicleId],
    references: [vehicles.id],
  }),
  renter: one(profiles, {
    fields: [bookings.renterId],
    references: [profiles.id],
    relationName: 'renter_bookings',
  }),
  owner: one(profiles, {
    fields: [bookings.ownerId],
    references: [profiles.id],
    relationName: 'owner_bookings',
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(profiles, {
    fields: [reviews.reviewerId],
    references: [profiles.id],
    relationName: 'written_reviews',
  }),
  reviewedUser: one(profiles, {
    fields: [reviews.reviewedUserId],
    references: [profiles.id],
    relationName: 'user_reviews',
  }),
  vehicle: one(vehicles, {
    fields: [reviews.vehicleId],
    references: [vehicles.id],
  }),
}));

export const communityEventsRelations = relations(communityEvents, ({ one }) => ({
  creator: one(profiles, {
    fields: [communityEvents.creatorId],
    references: [profiles.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(profiles, {
    fields: [subscriptions.userId],
    references: [profiles.id],
  }),
}));

export const adminReportsRelations = relations(adminReports, ({ one }) => ({
  reporter: one(profiles, {
    fields: [adminReports.reporterId],
    references: [profiles.id],
  }),
}));
