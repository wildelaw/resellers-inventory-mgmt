import { z } from 'zod';

// User role schema
export const userRoleSchema = z.enum(['admin', 'user']);

// Item status schema
export const itemStatusSchema = z.enum([
  'available',
  'listed',
  'sold',
  'returned',
  'donated',
  'discarded',
]);

// Platform schema
export const platformSchema = z.enum([
  'local',
  'facebook',
  'instagram',
  'ebay',
  'poshmark',
  'mercari',
  'consignment',
  'other',
]);

// Refund type schema
export const refundTypeSchema = z.enum([
  'none',
  'refund_no_return',
  'refund_with_return',
]);

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters');

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  role: userRoleSchema.default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().min(1).max(200).optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// Item schemas
export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  description: z.string().max(2000, 'Description must be at most 2000 characters').optional(),
  purchaseDate: z.coerce.date(),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive'),
  purchaseLocation: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.coerce.number().positive().optional(),
  purchaseLocation: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  status: itemStatusSchema.optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
});

export const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one item ID is required'),
  status: itemStatusSchema,
});

// Sale schemas
export const createSaleSchema = z.object({
  itemId: z.number().int().positive().optional(),
  soldDate: z.coerce.date(),
  soldPrice: z.coerce.number().positive('Sold price must be positive'),
  shippingCost: z.coerce.number().nonnegative().optional(),
  shippingCollected: z.coerce.number().nonnegative().optional().default(0),
  platform: platformSchema,
  salesTax: z.coerce.number().nonnegative().optional(),
  platformFees: z.coerce.number().nonnegative().optional().default(0),
});

export const updateSaleSchema = z.object({
  soldDate: z.coerce.date().optional(),
  soldPrice: z.coerce.number().positive().optional(),
  shippingCost: z.coerce.number().nonnegative().optional(),
  shippingCollected: z.coerce.number().nonnegative().optional(),
  platform: platformSchema.optional(),
  salesTax: z.coerce.number().nonnegative().optional(),
  platformFees: z.coerce.number().nonnegative().optional(),
});

export const updateRefundSchema = z.object({
  saleId: z.number().int().positive(),
  refundAmount: z.coerce.number().positive('Refund amount must be positive'),
  refundReason: z.string().min(1, 'Refund reason is required').max(500),
  refundType: refundTypeSchema.refine(
    (val) => val !== 'none',
    'Refund type must be specified'
  ),
});

// Mileage schemas
export const createMileageSchema = z.object({
  date: z.coerce.date(),
  miles: z.coerce.number().positive('Miles must be positive'),
  fromLocation: z.string().max(200).optional(),
  toLocation: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  vehicle: z.string().max(100).optional(),
  purpose: z.string().max(500).optional(),
});

export const updateMileageSchema = z.object({
  date: z.coerce.date().optional(),
  miles: z.coerce.number().positive().optional(),
  fromLocation: z.string().max(200).optional(),
  toLocation: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  vehicle: z.string().max(100).optional(),
  purpose: z.string().max(500).optional(),
});

// Settings schemas
export const updateSettingsSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  companyTagline: z.string().max(500).optional(),
  salesTaxRate: z.coerce.number().min(0).max(1).optional(),
});

// Import schemas
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().max(1024 * 1024, 'CSV data must be less than 1MB'),
  columnMappings: z.record(z.string()).optional(),
});

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Setup schema
export const setupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: emailSchema,
  password: passwordSchema,
});

// Photo upload validation
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function validatePhotoUpload(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed types: JPEG, PNG, GIF, WebP',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

// Backup validation schemas
export const backupUserSchema = z.object({
  id: z.number().int().positive(),
  email: emailSchema,
  passwordHash: z.string().min(1),
  name: z.string().min(1).max(200),
  role: userRoleSchema,
  canViewAll: z.boolean(),
  isActive: z.boolean(),
  passwordChangedAt: z.number().int().nonnegative(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  createdBy: z.number().int().positive().nullable(),
  lastLogin: z.number().int().positive().nullable(),
});

export const backupItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  purchaseDate: z.number().int().positive(),
  purchasePrice: z.number().positive(),
  purchaseLocation: z.string().max(200).nullable(),
  category: z.string().max(100).nullable(),
  status: itemStatusSchema,
  notes: z.string().max(2000).nullable(),
  removalDate: z.number().int().positive().nullable(),
  metadata: z.string().nullable(),
  ownerId: z.number().int().positive(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const backupSaleSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive().nullable(),
  soldDate: z.number().int().positive(),
  soldPrice: z.number().positive(),
  shippingCost: z.number().nonnegative().nullable(),
  shippingCollected: z.number().nonnegative(),
  platform: platformSchema,
  salesTax: z.number().nonnegative().nullable(),
  platformFees: z.number().nonnegative(),
  refundAmount: z.number().nonnegative(),
  refundReason: z.string().max(500).nullable(),
  refundType: refundTypeSchema,
  soldBy: z.number().int().positive(),
  createdAt: z.number().int().positive(),
});

export const backupPhotoSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive(),
  filename: z.string().min(1),
  path: z.string().min(1),
  isPrimary: z.boolean(),
  createdAt: z.number().int().positive(),
});

export const backupMileageSchema = z.object({
  id: z.number().int().positive(),
  date: z.number().int().positive(),
  miles: z.number().positive(),
  fromLocation: z.string().max(200).nullable(),
  toLocation: z.string().max(200).nullable(),
  address: z.string().max(500).nullable(),
  vehicle: z.string().max(100).nullable(),
  purpose: z.string().max(500).nullable(),
  ownerId: z.number().int().positive(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const backupAppConfigSchema = z.object({
  id: z.number().int().positive(),
  companyName: z.string().min(1).max(200),
  companyTagline: z.string().max(500),
  salesTaxRate: z.number().min(0).max(1),
  setupComplete: z.boolean(),
  updatedAt: z.number().int().positive(),
});

export const backupSchema = z.object({
  version: z.number().int().positive(),
  exportedAt: z.string(),
  tables: z.object({
    users: z.array(backupUserSchema),
    items: z.array(backupItemSchema),
    sales: z.array(backupSaleSchema),
    photos: z.array(backupPhotoSchema),
    mileage: z.array(backupMileageSchema),
    app_config: z.array(backupAppConfigSchema),
  }),
});
