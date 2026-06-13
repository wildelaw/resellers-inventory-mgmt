// @ts-nocheck
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from './constants';

// ─── User Schemas ───────────────────────────────────────────────────────────
export const userRoleSchema = z.enum(['admin', 'user']);

export const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  role: userRoleSchema.default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  name: z.string().min(1).max(200, '').optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ─── Item Schemas ───────────────────────────────────────────────────────────
export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  description: z.string().max(2000, '').optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive'),
  purchaseLocation: z.string().max(200, '').optional().nullable(),
  category: z.string().max(100, '').optional().nullable(),
  notes: z.string().max(2000, '').optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200, '').optional(),
  description: z.string().max(2000, '').optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }).optional(),
  purchasePrice: z.coerce.number().positive().optional(),
  purchaseLocation: z.string().max(200, '').optional().nullable(),
  category: z.string().max(100, '').optional().nullable(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']).optional(),
  notes: z.string().max(2000, '').optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  removalDate: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }).optional().nullable(),
});

// ─── Sale Schemas ────────────────────────────────────────────────────────────
export const createSaleSchema = z.object({
  itemId: z.number().int().positive().optional().nullable(),
  soldDate: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }),
  soldPrice: z.coerce.number().positive('Sold price must be positive'),
  shippingCost: z.coerce.number().min(0).optional().default(0),
  shippingCollected: z.coerce.number().min(0).optional().default(0),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  salesTax: z.coerce.number().min(0).optional().nullable().nullable(),
  platformFees: z.coerce.number().min(0).optional().default(0),
});

export const updateSaleSchema = z.object({
  soldDate: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }).optional(),
  soldPrice: z.coerce.number().positive().optional(),
  shippingCost: z.coerce.number().min(0).optional().nullable(),
  shippingCollected: z.coerce.number().min(0).optional().nullable(),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']).optional(),
  salesTax: z.coerce.number().min(0).optional().nullable(),
  platformFees: z.coerce.number().min(0).optional().nullable(),
});

export const refundSchema = z.object({
  saleId: z.number().int().positive(),
  refundAmount: z.coerce.number().min(0),
  refundReason: z.string().max(500, '').optional().nullable(),
  refundType: z.enum(['refund_no_return', 'refund_with_return']),
});

// ─── Mileage Schemas ────────────────────────────────────────────────────────
export const createMileageSchema = z.object({
  date: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }),
  miles: z.coerce.number().positive('Miles must be positive'),
  fromLocation: z.string().max(200, '').optional().nullable(),
  toLocation: z.string().max(200, '').optional().nullable(),
  address: z.string().max(500, '').optional().nullable(),
  vehicle: z.string().max(100, '').optional().nullable(),
  purpose: z.string().max(500, '').optional().nullable(),
});

export const updateMileageSchema = z.object({
  date: z.union([z.string(), z.number()]).transform(v => {
    if (typeof v === 'number') return v;
    const parsed = Date.parse(v);
    if (isNaN(parsed)) throw new Error('Invalid date');
    return Math.floor(parsed / 1000);
  }).optional(),
  miles: z.coerce.number().positive().optional(),
  fromLocation: z.string().max(200, '').optional().nullable(),
  toLocation: z.string().max(200, '').optional().nullable(),
  address: z.string().max(500, '').optional().nullable(),
  vehicle: z.string().max(100, '').optional().nullable(),
  purpose: z.string().max(500, '').optional().nullable(),
});

// ─── Bulk Operations ────────────────────────────────────────────────────────
export const bulkStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one ID required').max(100, 'Maximum 100 items per operation'),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100, ''),
});

// ─── Setup Schemas ──────────────────────────────────────────────────────────
export const setupCreateAdminSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, ''),
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
});

// ─── Profile Schemas ────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  type: z.enum(['profile', 'password']),
  name: z.string().min(1).max(200, '').optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
}).refine(
  (data) => {
    if (data.type === 'password') {
      return !!data.currentPassword && !!data.newPassword;
    }
    return true;
  },
  { message: 'Current password and new password required for password change' }
);

// ─── Settings Schemas ───────────────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  companyName: z.string().max(200, '').optional(),
  companyTagline: z.string().max(500, '').optional(),
  salesTaxRate: z.number().min(0).max(1, '').optional(),
});

// ─── Import Schemas ─────────────────────────────────────────────────────────
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().min(1, 'CSV data is required').max(1048576, 'CSV data must be less than 1MB'),
  columnMappings: z.record(z.string()).optional(),
});

// ─── Photo Upload Validation ────────────────────────────────────────────────
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB