/**
 * Drizzle ORM schema for the Resell Inventory Manager (v2).
 *
 * Six tables: users, items, sales, photos, mileage, app_config.
 *
 * Conventions:
 *  - Timestamps are stored as raw INTEGER unix seconds.
 *  - Booleans are stored as raw INTEGER (0/1). Helpers below coerce.
 *  - No sessions/accounts/verification_tokens/revoked_tokens tables (removed in v2).
 */
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'),
  canViewAll: integer('can_view_all').notNull().default(0),
  isActive: integer('is_active').notNull().default(1),
  passwordChangedAt: integer('password_changed_at').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: integer('created_by'),
  lastLogin: integer('last_login'),
}, (t) => ({
  emailIdx: index('email_idx').on(t.email),
  roleIdx: index('role_idx').on(t.role),
  isActiveIdx: index('is_active_idx').on(t.isActive),
}));

// ---------------------------------------------------------------------------
// items
// ---------------------------------------------------------------------------
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  purchaseDate: integer('purchase_date').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  purchaseLocation: text('purchase_location'),
  category: text('category'),
  status: text('status').notNull().default('available'),
  notes: text('notes'),
  removalDate: integer('removal_date'),
  metadata: text('metadata'),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => ({
  statusIdx: index('status_idx').on(t.status),
  ownerIdIdx: index('owner_id_idx').on(t.ownerId),
  categoryIdx: index('category_idx').on(t.category),
  purchaseDateIdx: index('purchase_date_idx').on(t.purchaseDate),
  ownerStatusIdx: index('owner_status_idx').on(t.ownerId, t.status),
}));

// ---------------------------------------------------------------------------
// sales
// ---------------------------------------------------------------------------
export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id, { onDelete: 'cascade' }),
  soldDate: integer('sold_date').notNull(),
  soldPrice: real('sold_price').notNull(),
  shippingCost: real('shipping_cost'),
  shippingCollected: real('shipping_collected').default(0),
  platform: text('platform').notNull(),
  salesTax: real('sales_tax'),
  platformFees: real('platform_fees').default(0),
  refundAmount: real('refund_amount').default(0),
  refundReason: text('refund_reason'),
  refundType: text('refund_type').notNull().default('none'),
  soldBy: integer('sold_by').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  soldDateIdx: index('sold_date_idx').on(t.soldDate),
  itemIdIdx: index('item_id_idx').on(t.itemId),
  platformIdx: index('platform_idx').on(t.platform),
  soldByIdx: index('sold_by_idx').on(t.soldBy),
  soldByDateIdx: index('sold_by_date_idx').on(t.soldBy, t.soldDate),
}));

// ---------------------------------------------------------------------------
// photos
// ---------------------------------------------------------------------------
export const photos = sqliteTable('photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  path: text('path').notNull(),
  isPrimary: integer('is_primary').notNull().default(0),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  photoItemIdIdx: index('photo_item_id_idx').on(t.itemId),
}));

// ---------------------------------------------------------------------------
// mileage
// ---------------------------------------------------------------------------
export const mileage = sqliteTable('mileage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: integer('date').notNull(),
  miles: real('miles').notNull(),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  address: text('address'),
  vehicle: text('vehicle'),
  purpose: text('purpose'),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (t) => ({
  mileageDateIdx: index('mileage_date_idx').on(t.date),
  mileageOwnerIdx: index('mileage_owner_idx').on(t.ownerId),
}));

// ---------------------------------------------------------------------------
// app_config (single-row typed table; id always 1)
// ---------------------------------------------------------------------------
export const appConfig = sqliteTable('app_config', {
  id: integer('id').primaryKey().default(1),
  companyName: text('company_name').notNull().default('Resale Manager'),
  companyTagline: text('company_tagline').notNull().default(''),
  salesTaxRate: real('sales_tax_rate').notNull().default(0.0825),
  setupComplete: integer('setup_complete').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

// ---------------------------------------------------------------------------
// Relations (enables db.query.* with-relations queries)
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  sales: many(sales),
  mileage: many(mileage),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  owner: one(users, { fields: [items.ownerId], references: [users.id] }),
  photos: many(photos),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  item: one(items, { fields: [sales.itemId], references: [items.id] }),
  seller: one(users, { fields: [sales.soldBy], references: [users.id] }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  item: one(items, { fields: [photos.itemId], references: [items.id] }),
}));

export const mileageRelations = relations(mileage, ({ one }) => ({
  owner: one(users, { fields: [mileage.ownerId], references: [users.id] }),
}));

// ---------------------------------------------------------------------------
// Aggregated schema object (passed to drizzle() for the relational query API)
// ---------------------------------------------------------------------------
export const schema = {
  users,
  items,
  sales,
  photos,
  mileage,
  appConfig,
  usersRelations,
  itemsRelations,
  salesRelations,
  photosRelations,
  mileageRelations,
};

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Sale = typeof sales.$inferSelect;
export type NewSale = typeof sales.$inferInsert;
export type Photo = typeof photos.$inferSelect;
export type NewPhoto = typeof photos.$inferInsert;
export type Mileage = typeof mileage.$inferSelect;
export type NewMileage = typeof mileage.$inferInsert;
export type AppConfigRow = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;

// ---------------------------------------------------------------------------
// Boolean coercion helpers (schema stores raw 0/1 integers)
// ---------------------------------------------------------------------------
export const nowTs = (): number => Math.floor(Date.now() / 1000);

export const toBool = (v: unknown): boolean => v === 1 || v === true;
export const fromBool = (v: boolean): 0 | 1 => (v ? 1 : 0);

export const DEFAULT_APP_CONFIG_ID = 1;

/** SQL fragment to enforce the single-row app_config invariant. */
export const SINGLE_ROW_GUARD = sql`INSERT OR IGNORE INTO app_config (id) VALUES (1)`;