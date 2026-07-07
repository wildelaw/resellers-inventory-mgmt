import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============ USERS ============
export const users = sqliteTable('users', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { mode: 'text' }).notNull().default('user'),
  canViewAll: integer('can_view_all', { mode: 'boolean' }).notNull().default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  passwordChangedAt: integer('password_changed_at', { mode: 'number' }).notNull().default(0),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
  createdBy: integer('created_by'),
  lastLogin: integer('last_login'),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  roleIdx: index('role_idx').on(table.role),
  isActiveIdx: index('is_active_idx').on(table.isActive),
}));

export const usersRelations = relations(users, ({ many }) => ({
  items: many(items),
  sales: many(sales),
  mileage: many(mileage),
}));

// ============ ITEMS ============
export const items = sqliteTable('items', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  purchaseDate: integer('purchase_date', { mode: 'number' }).notNull(),
  purchasePrice: real('purchase_price').notNull(),
  purchaseLocation: text('purchase_location'),
  category: text('category'),
  status: text('status', { mode: 'text' }).notNull().default('available'),
  notes: text('notes'),
  removalDate: integer('removal_date', { mode: 'number' }),
  metadata: text('metadata', { mode: 'json' }),
  ownerId: integer('owner_id', { mode: 'number' }).notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
}, (table) => ({
  statusIdx: index('status_idx').on(table.status),
  ownerIdIdx: index('owner_id_idx').on(table.ownerId),
  categoryIdx: index('category_idx').on(table.category),
  purchaseDateIdx: index('purchase_date_idx').on(table.purchaseDate),
  ownerStatusIdx: index('owner_status_idx').on(table.ownerId, table.status),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  owner: one(users, { fields: [items.ownerId], references: [users.id] }),
  sales: many(sales),
  photos: many(photos),
}));

// ============ SALES ============
export const sales = sqliteTable('sales', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  itemId: integer('item_id', { mode: 'number' }).references(() => items.id),
  soldDate: integer('sold_date', { mode: 'number' }).notNull(),
  soldPrice: real('sold_price').notNull(),
  shippingCost: real('shipping_cost'),
  shippingCollected: real('shipping_collected').default(0),
  platform: text('platform', { mode: 'text' }).notNull(),
  salesTax: real('sales_tax'),
  platformFees: real('platform_fees').default(0),
  refundAmount: real('refund_amount').default(0),
  refundReason: text('refund_reason'),
  refundType: text('refund_type', { mode: 'text' }).notNull().default('none'),
  soldBy: integer('sold_by', { mode: 'number' }).notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
}, (table) => ({
  soldDateIdx: index('sold_date_idx').on(table.soldDate),
  itemIdIdx: index('item_id_idx').on(table.itemId),
  platformIdx: index('platform_idx').on(table.platform),
  soldByIdx: index('sold_by_idx').on(table.soldBy),
  soldByDateIdx: index('sold_by_date_idx').on(table.soldBy, table.soldDate),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  item: one(items, { fields: [sales.itemId], references: [items.id] }),
  seller: one(users, { fields: [sales.soldBy], references: [users.id] }),
}));

// ============ PHOTOS ============
export const photos = sqliteTable('photos', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  itemId: integer('item_id', { mode: 'number' }).notNull().references(() => items.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  path: text('path').notNull(),
  isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
}, (table) => ({
  photoItemIdIdx: index('photo_item_id_idx').on(table.itemId),
}));

export const photosRelations = relations(photos, ({ one }) => ({
  item: one(items, { fields: [photos.itemId], references: [items.id] }),
}));

// ============ MILEAGE ============
export const mileage = sqliteTable('mileage', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  date: integer('date', { mode: 'number' }).notNull(),
  miles: real('miles').notNull(),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  address: text('address'),
  vehicle: text('vehicle'),
  purpose: text('purpose'),
  ownerId: integer('owner_id', { mode: 'number' }).notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
}, (table) => ({
  mileageDateIdx: index('mileage_date_idx').on(table.date),
  mileageOwnerIdx: index('mileage_owner_idx').on(table.ownerId),
}));

export const mileageRelations = relations(mileage, ({ one }) => ({
  owner: one(users, { fields: [mileage.ownerId], references: [users.id] }),
}));

// ============ APP_CONFIG ============
export const appConfig = sqliteTable('app_config', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }).default(1),
  companyName: text('company_name').notNull().default('Resale Manager'),
  companyTagline: text('company_tagline').notNull().default(''),
  salesTaxRate: real('sales_tax_rate').notNull().default(0.0825),
  setupComplete: integer('setup_complete', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

// ============ TYPE EXPORTS ============
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