import { sqliteTable, integer, text, real, index } from 'drizzle-orm/sqlite-core';

export type ItemStatusEnum = 'available' | 'listed' | 'sold' | 'returned' | 'donated' | 'discarded';
export type UserRoleEnum = 'admin' | 'user';
export type SalePlatformEnum = 'local' | 'facebook' | 'instagram' | 'ebay' | 'poshmark' | 'mercari' | 'consignment' | 'other';
export type RefundTypeEnum = 'none' | 'refund_no_return' | 'refund_with_return';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

// NOTE: users.createdBy has a logical FK to users.id, but a self-referencing
// Drizzle .references() call creates a circular type error — the FK is
// enforced in application logic instead.

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  canViewAll: integer('can_view_all', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  passwordChangedAt: integer('password_changed_at').notNull().default(0),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  createdBy: integer('created_by'),
  lastLogin: integer('last_login', { mode: 'timestamp_ms' }),
}, (table) => [
  index('email_idx').on(table.email),
  index('role_idx').on(table.role),
  index('is_active_idx').on(table.isActive),
]);

export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  purchaseDate: timestamp('purchase_date').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  purchaseLocation: text('purchase_location'),
  category: text('category'),
  status: text('status', { enum: ['available', 'listed', 'sold', 'returned', 'donated', 'discarded'] }).notNull().default('available'),
  notes: text('notes'),
  removalDate: integer('removal_date', { mode: 'timestamp_ms' }),
  metadata: text('metadata'),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => [
  index('status_idx').on(table.status),
  index('owner_id_idx').on(table.ownerId),
  index('category_idx').on(table.category),
  index('purchase_date_idx').on(table.purchaseDate),
  index('owner_status_idx').on(table.ownerId, table.status),
]);

export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id, { onDelete: 'cascade' }),
  soldDate: timestamp('sold_date').notNull(),
  soldPrice: real('sold_price').notNull(),
  shippingCost: real('shipping_cost'),
  shippingCollected: real('shipping_collected').default(0),
  platform: text('platform', { enum: ['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other'] }).notNull(),
  salesTax: real('sales_tax'),
  platformFees: real('platform_fees').default(0),
  refundAmount: real('refund_amount').default(0),
  refundReason: text('refund_reason'),
  refundType: text('refund_type', { enum: ['none', 'refund_no_return', 'refund_with_return'] }).default('none'),
  soldBy: integer('sold_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull(),
}, (table) => [
  index('sold_date_idx').on(table.soldDate),
  index('item_id_idx').on(table.itemId),
  index('platform_idx').on(table.platform),
  index('sold_by_idx').on(table.soldBy),
  index('sold_by_date_idx').on(table.soldBy, table.soldDate),
]);

export const photos = sqliteTable('photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  path: text('path').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
}, (table) => [
  index('photo_item_id_idx').on(table.itemId),
]);

export const mileage = sqliteTable('mileage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: timestamp('date').notNull(),
  miles: real('miles').notNull(),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  address: text('address'),
  vehicle: text('vehicle'),
  purpose: text('purpose'),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => [
  index('mileage_date_idx').on(table.date),
  index('mileage_owner_idx').on(table.ownerId),
]);

// Single-row application configuration — replaces the v1 key-value settings table.
export const appConfig = sqliteTable('app_config', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyName: text('company_name').default('Resale Manager'),
  companyTagline: text('company_tagline').default(''),
  salesTaxRate: real('sales_tax_rate').default(0.0825),
  setupComplete: integer('setup_complete', { mode: 'boolean' }).notNull().default(false),
  updatedAt: timestamp('updated_at').notNull(),
});

// Relations for db.query.* relational queries
import { relations } from 'drizzle-orm';

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

// Type aliases
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
export type AppConfig = typeof appConfig.$inferSelect;
export type NewAppConfig = typeof appConfig.$inferInsert;