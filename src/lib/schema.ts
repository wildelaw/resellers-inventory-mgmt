import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  canViewAll: integer('can_view_all', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  passwordChangedAt: integer('password_changed_at', { mode: 'timestamp' }).notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdBy: integer('created_by').references(() => users.id),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
});

// Items table
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  purchaseDate: integer('purchase_date', { mode: 'timestamp' }).notNull(),
  purchasePrice: real('purchase_price').notNull(),
  purchaseLocation: text('purchase_location'),
  category: text('category'),
  status: text('status', { 
    enum: ['available', 'listed', 'sold', 'returned', 'donated', 'discarded'] 
  }).notNull().default('available'),
  notes: text('notes'),
  removalDate: integer('removal_date', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Sales table
export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id),
  soldDate: integer('sold_date', { mode: 'timestamp' }).notNull(),
  soldPrice: real('sold_price').notNull(),
  shippingCost: real('shipping_cost'),
  shippingCollected: real('shipping_collected').default(0),
  platform: text('platform', { 
    enum: ['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other'] 
  }).notNull(),
  salesTax: real('sales_tax'),
  platformFees: real('platform_fees').default(0),
  refundAmount: real('refund_amount').default(0),
  refundReason: text('refund_reason'),
  refundType: text('refund_type', { 
    enum: ['none', 'refund_no_return', 'refund_with_return'] 
  }).notNull().default('none'),
  soldBy: integer('sold_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Photos table
export const photos = sqliteTable('photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  path: text('path').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Mileage table
export const mileage = sqliteTable('mileage', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  miles: real('miles').notNull(),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  address: text('address'),
  vehicle: text('vehicle'),
  purpose: text('purpose'),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// App config table (single row)
export const appConfig = sqliteTable('app_config', {
  id: integer('id').primaryKey({ autoIncrement: true }).default(1),
  companyName: text('company_name').notNull().default('Resale Manager'),
  companyTagline: text('company_tagline').notNull().default(''),
  salesTaxRate: real('sales_tax_rate').notNull().default(0.0825),
  setupComplete: integer('setup_complete', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  sales: many(sales),
  mileage: many(mileage),
  createdUsers: many(users),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  owner: one(users, {
    fields: [items.ownerId],
    references: [users.id],
  }),
  photos: many(photos),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  item: one(items, {
    fields: [sales.itemId],
    references: [items.id],
  }),
  seller: one(users, {
    fields: [sales.soldBy],
    references: [users.id],
  }),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  item: one(items, {
    fields: [photos.itemId],
    references: [items.id],
  }),
}));

export const mileageRelations = relations(mileage, ({ one }) => ({
  owner: one(users, {
    fields: [mileage.ownerId],
    references: [users.id],
  }),
}));

// Type exports
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
