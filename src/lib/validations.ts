import { z } from 'zod/v4';
import { ALL_STATUSES, PLATFORMS, type ItemStatus, type Platform, type RefundType } from './constants';

// ─── Password ────────────────────────────────────────────────────────
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

// ─── Auth ────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const setupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
});

// ─── Items ───────────────────────────────────────────────────────────
export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.coerce.number().int('Purchase date is required'),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive'),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.string().max(10000).optional().nullable(),
  status: z.enum(ALL_STATUSES as [ItemStatus, ...ItemStatus[]]).optional().default('available'),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.coerce.number().int().optional(),
  purchasePrice: z.coerce.number().positive().optional(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(ALL_STATUSES as [ItemStatus, ...ItemStatus[]]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.string().max(10000).optional().nullable(),
});

export const bulkStatusUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one item ID is required'),
  status: z.enum(ALL_STATUSES as [ItemStatus, ...ItemStatus[]]),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one item ID is required'),
});

// ─── Sales ───────────────────────────────────────────────────────────
export const createSaleSchema = z.object({
  itemId: z.number().int().positive().optional().nullable(),
  soldDate: z.coerce.number().int('Sale date is required'),
  soldPrice: z.coerce.number().positive('Sold price must be positive'),
  shippingCost: z.coerce.number().nonnegative().optional().nullable(),
  shippingCollected: z.coerce.number().nonnegative().optional().nullable(),
  platform: z.enum(PLATFORMS as [Platform, ...Platform[]]),
  salesTax: z.coerce.number().nonnegative().optional().nullable(),
  platformFees: z.coerce.number().nonnegative().optional().nullable(),
});

export const updateSaleSchema = z.object({
  soldDate: z.coerce.number().int().optional(),
  soldPrice: z.coerce.number().positive().optional(),
  shippingCost: z.coerce.number().nonnegative().optional().nullable(),
  shippingCollected: z.coerce.number().nonnegative().optional().nullable(),
  platform: z.enum(PLATFORMS as [Platform, ...Platform[]]).optional(),
  salesTax: z.coerce.number().nonnegative().optional().nullable(),
  platformFees: z.coerce.number().nonnegative().optional().nullable(),
});

export const refundSaleSchema = z.object({
  saleId: z.number().int().positive('Sale ID is required'),
  refundAmount: z.coerce.number().nonnegative('Refund amount must be non-negative'),
  refundReason: z.string().max(500).optional().nullable(),
  refundType: z.enum(['refund_no_return', 'refund_with_return'] as const),
});

// ─── Mileage ─────────────────────────────────────────────────────────
export const createMileageSchema = z.object({
  date: z.coerce.number().int('Date is required'),
  miles: z.coerce.number().positive('Miles must be positive'),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

export const updateMileageSchema = z.object({
  date: z.coerce.number().int().optional(),
  miles: z.coerce.number().positive().optional(),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

// ─── Users (Admin) ───────────────────────────────────────────────────
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['admin', 'user']),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['admin', 'user']).optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ─── Profile ─────────────────────────────────────────────────────────
export const updateProfileSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('profile'),
    name: z.string().min(1).max(200),
  }),
  z.object({
    type: z.literal('password'),
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
  }),
]);

// ─── Settings ────────────────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  company_name: z.string().max(200).optional(),
  company_tagline: z.string().max(500).optional(),
  sales_tax_rate: z.number().min(0).max(1).optional(),
});

// ─── Import ──────────────────────────────────────────────────────────
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().min(1, 'CSV data is required').max(1048576, 'CSV data must be under 1MB'),
  columnMappings: z.record(z.string(), z.string()).optional(),
});

// ─── Photo ────────────────────────────────────────────────────────────
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB