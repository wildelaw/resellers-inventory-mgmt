/**
 * Zod validation schemas for all API inputs. v2: userRole is admin/user only,
 * and create/update user schemas include `canViewAll`.
 */
import { z } from 'zod';
import { ALL_STATUSES, PLATFORMS, REFUND_TYPES } from './constants';

// ---- Shared building blocks -------------------------------------------------
const positiveReal = z.coerce.number().refine((n) => n >= 0, { message: 'Must be >= 0' });
const nonNegReal = z.coerce.number().refine((n) => n >= 0, { message: 'Must be >= 0' });
const optionalString = (max: number) => z.string().trim().max(max).optional().nullable();
const optionalNonNeg = z.coerce.number().optional().nullable().refine(
  (n) => n === null || n === undefined || n >= 0,
  { message: 'Must be >= 0' },
);

// ---- Auth / setup -----------------------------------------------------------
export const setupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().toLowerCase().email('Valid email required').max(254),
  password: passwordSchema(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email required'),
  password: z.string().min(1, 'Password is required'),
});

/** Password policy: 8-128 chars, upper, lower, digit, special. */
export function passwordSchema() {
  return z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a digit')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character');
}

// ---- Inventory --------------------------------------------------------------
const itemStatusEnum = z.enum(ALL_STATUSES as [string, ...string[]]);

export const createItemSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: optionalString(2000),
  purchaseDate: z.union([z.coerce.number().int().positive(), z.string().trim().min(1)])
    .transform((v) => (typeof v === 'number' ? v : parseDateToUnix(v)))
    .refine((v) => v !== null && v! > 0, { message: 'Valid purchase date is required' }),
  purchasePrice: z.coerce.number().refine((n) => n >= 0, { message: 'Purchase price must be >= 0' }),
  purchaseLocation: optionalString(200),
  category: optionalString(100),
  status: itemStatusEnum.optional(),
  notes: optionalString(2000),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: optionalString(2000),
  purchaseDate: z.union([z.coerce.number().int().positive(), z.string().trim().min(1)])
    .transform((v) => (typeof v === 'number' ? v : parseDateToUnix(v)))
    .optional()
    .nullable(),
  purchasePrice: z.coerce.number().min(0).optional(),
  purchaseLocation: optionalString(200),
  category: optionalString(100),
  status: itemStatusEnum.optional(),
  notes: optionalString(2000),
  removalDate: z.coerce.number().int().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const bulkStatusSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, 'At least one id required'),
  status: itemStatusEnum,
});

// ---- Sales ------------------------------------------------------------------
const platformEnum = z.enum(PLATFORMS as [string, ...string[]]);
const refundTypeEnum = z.enum(REFUND_TYPES as [string, ...string[]]);

export const createSaleSchema = z.object({
  itemId: z.coerce.number().int().positive().optional().nullable(),
  soldDate: z.union([z.coerce.number().int(), z.string().trim().min(1)])
    .transform((v) => (typeof v === 'number' ? v : parseDateToUnix(v)))
    .refine((v) => v !== null, { message: 'Valid sold date required' }),
  soldPrice: positiveReal,
  shippingCost: optionalNonNeg,
  shippingCollected: optionalNonNeg,
  platform: platformEnum,
  salesTax: optionalNonNeg,
  platformFees: optionalNonNeg,
  refundAmount: optionalNonNeg,
  refundReason: optionalString(2000),
  refundType: refundTypeEnum.optional(),
});

export const updateSaleSchema = z.object({
  soldDate: z.union([z.coerce.number().int(), z.string().trim().min(1)])
    .transform((v) => (typeof v === 'number' ? v : parseDateToUnix(v)))
    .optional()
    .nullable(),
  soldPrice: positiveReal.optional(),
  shippingCost: optionalNonNeg,
  shippingCollected: optionalNonNeg,
  platform: platformEnum.optional(),
  salesTax: optionalNonNeg,
  platformFees: optionalNonNeg,
  refundReason: optionalString(2000),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const refundSchema = z.object({
  saleId: z.coerce.number().int().positive(),
  refundAmount: nonNegReal,
  refundReason: optionalString(2000),
  refundType: z.enum(['refund_no_return', 'refund_with_return']),
});

// ---- Mileage ----------------------------------------------------------------
export const createMileageSchema = z.object({
  date: z.union([z.coerce.number().int(), z.string().trim().min(1)])
    .transform((v) => (typeof v === 'number' ? v : parseDateToUnix(v)))
    .refine((v) => v !== null, { message: 'Valid date required' }),
  miles: z.coerce.number().refine((n) => n >= 0, { message: 'Miles must be >= 0' }),
  fromLocation: optionalString(200),
  toLocation: optionalString(200),
  address: optionalString(500),
  vehicle: optionalString(200),
  purpose: optionalString(500),
});

export const updateMileageSchema = z.object({
  date: z.union([z.coerce.number().int(), z.string().trim().min(1)])
    .transform((v) => (typeof v === 'number' ? v : parseDateToUnix(v)))
    .optional()
    .nullable(),
  miles: z.coerce.number().min(0).optional(),
  fromLocation: optionalString(200),
  toLocation: optionalString(200),
  address: optionalString(500),
  vehicle: optionalString(200),
  purpose: optionalString(500),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

// ---- Users (admin) ----------------------------------------------------------
export const userRoleEnum = z.enum(['admin', 'user']);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email required').max(254),
  password: passwordSchema(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  role: userRoleEnum,
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  role: userRoleEnum.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema(),
});

// ---- Profile ----------------------------------------------------------------
export const updateProfileSchema = z.object({
  type: z.literal('profile'),
  name: z.string().trim().min(1).max(200),
});

export const changePasswordSchema = z.object({
  type: z.literal('password'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema(),
}).refine((d) => d.currentPassword !== d.newPassword, {
  message: 'New password must differ from current',
  path: ['newPassword'],
});

export const profileUpdateSchema = z.union([updateProfileSchema, changePasswordSchema]);

// ---- Settings ---------------------------------------------------------------
export const updateSettingsSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  companyTagline: z.string().trim().max(500).optional(),
  salesTaxRate: z.coerce.number().min(0, 'Tax rate must be >= 0').max(1, 'Tax rate must be <= 1').optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

// ---- Import -----------------------------------------------------------------
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().max(1024 * 1024, 'CSV data limited to 1MB'),
  columnMappings: z.record(z.string(), z.string()).optional(),
});

// ---- Helpers ----------------------------------------------------------------
function parseDateToUnix(v: string): number | null {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

// ---- Backup validation (used by backup.ts and restore) ---------------------
export const backupUserSchema = z.object({
  id: z.number().int(),
  email: z.string().email(),
  passwordHash: z.string(),
  name: z.string(),
  role: userRoleEnum,
  canViewAll: z.union([z.boolean(), z.number()]),
  isActive: z.union([z.boolean(), z.number()]),
  passwordChangedAt: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  createdBy: z.number().int().nullable().optional(),
  lastLogin: z.number().int().nullable().optional(),
});

export const backupItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable().optional(),
  purchaseDate: z.number().int(),
  purchasePrice: z.number(),
  purchaseLocation: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: itemStatusEnum,
  notes: z.string().nullable().optional(),
  removalDate: z.number().int().nullable().optional(),
  metadata: z.string().nullable().optional(),
  ownerId: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const backupSaleSchema = z.object({
  id: z.number().int(),
  itemId: z.number().int().nullable().optional(),
  soldDate: z.number().int(),
  soldPrice: z.number(),
  shippingCost: z.number().nullable().optional(),
  shippingCollected: z.number().nullable().optional(),
  platform: platformEnum,
  salesTax: z.number().nullable().optional(),
  platformFees: z.number().nullable().optional(),
  refundAmount: z.number().nullable().optional(),
  refundReason: z.string().nullable().optional(),
  refundType: refundTypeEnum.optional(),
  soldBy: z.number().int(),
  createdAt: z.number().int(),
});

export const backupPhotoSchema = z.object({
  id: z.number().int(),
  itemId: z.number().int(),
  filename: z.string(),
  path: z.string(),
  isPrimary: z.union([z.boolean(), z.number()]),
  createdAt: z.number().int(),
});

export const backupMileageSchema = z.object({
  id: z.number().int(),
  date: z.number().int(),
  miles: z.number(),
  fromLocation: z.string().nullable().optional(),
  toLocation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  ownerId: z.number().int(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

export const backupAppConfigSchema = z.object({
  id: z.number().int(),
  companyName: z.string(),
  companyTagline: z.string(),
  salesTaxRate: z.number(),
  setupComplete: z.union([z.boolean(), z.number()]),
  updatedAt: z.number().int(),
});