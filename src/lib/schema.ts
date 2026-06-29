import { sqliteTable, integer, text, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ---------- users ----------
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  canViewAll: integer('can_view_all', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
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

// ---------- items ----------
export const items = sqliteTable('items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  purchaseDate: integer('purchase_date').notNull(),
  purchasePrice: real('purchase_price').notNull(),
  purchaseLocation: text('purchase_location'),
  category: text('category'),
  status: text('status', {
    enum: ['available', 'listed', 'sold', 'returned', 'donated', 'discarded'],
  }).notNull().default('available'),
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

// ---------- sales ----------
export const sales = sqliteTable('sales', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').references(() => items.id),
  soldDate: integer('sold_date').notNull(),
  soldPrice: real('sold_price').notNull(),
  shippingCost: real('shipping_cost'),
  shippingCollected: real('shipping_collected').default(0),
  platform: text('platform', {
    enum: ['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other'],
  }).notNull(),
  salesTax: real('sales_tax'),
  platformFees: real('platform_fees').default(0),
  refundAmount: real('refund_amount').default(0),
  refundReason: text('refund_reason'),
  refundType: text('refund_type', {
    enum: ['none', 'refund_no_return', 'refund_with_return'],
  }).notNull().default('none'),
  soldBy: integer('sold_by').notNull().references(() => users.id),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  soldDateIdx: index('sold_date_idx').on(t.soldDate),
  itemIdIdx: index('item_id_idx').on(t.itemId),
  platformIdx: index('platform_idx').on(t.platform),
  soldByIdx: index('sold_by_idx').on(t.soldBy),
  soldByDateIdx: index('sold_by_date_idx').on(t.soldBy, t.soldDate),
}));

// ---------- photos ----------
export const photos = sqliteTable('photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  path: text('path').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
}, (t) => ({
  photoItemIdIdx: index('photo_item_id_idx').on(t.itemId),
}));

// ---------- mileage ----------
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

// ---------- app_config (single-row table, id always = 1) ----------
export const appConfig = sqliteTable('app_config', {
  id: integer('id').primaryKey({ autoIncrement: true }).default(1),
  companyName: text('company_name').default('Resale Manager'),
  companyTagline: text('company_tagline').default(''),
  salesTaxRate: real('sales_tax_rate').default(0.0825),
  setupComplete: integer('setup_complete', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at').notNull(),
});

// ---------- relations ----------
export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  sales: many(sales),
  mileage: many(mileage),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  owner: one(users, { fields: [items.ownerId], references: [users.id] }),
  sales: many(sales),
  photos: many(photos),
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

// ---------- inferred types ----------
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