import { z } from 'zod';

// ---------- Roles ----------
export const userRoleSchema = z.enum(['admin', 'user']);

// ---------- Item statuses / platforms / refund types ----------
export const itemStatusSchema = z.enum([
  'available',
  'listed',
  'sold',
  'returned',
  'donated',
  'discarded',
]);

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

export const refundTypeSchema = z.enum(['none', 'refund_no_return', 'refund_with_return']);

// ---------- Password policy ----------
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

// ---------- Inventory ----------
const priceSchema = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
  .refine((v) => !isNaN(v) && v >= 0, 'Price must be a non-negative number');

const dateSchema = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === 'number') return v;
    const d = new Date(v);
    return Math.floor(d.getTime() / 1000);
  })
  .refine((v) => !isNaN(v), 'Invalid date');

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: dateSchema,
  purchasePrice: priceSchema,
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: dateSchema.optional(),
  purchasePrice: priceSchema.optional(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: itemStatusSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one id required'),
  status: itemStatusSchema,
});

// ---------- Sales ----------
export const createSaleSchema = z.object({
  itemId: z.number().int().positive().optional().nullable(),
  soldDate: dateSchema,
  soldPrice: priceSchema,
  shippingCost: priceSchema.optional().nullable(),
  shippingCollected: priceSchema.optional().nullable(),
  platform: platformSchema,
  salesTax: priceSchema.optional().nullable(),
  platformFees: priceSchema.optional().nullable(),
});

export const updateSaleSchema = z.object({
  soldDate: dateSchema.optional(),
  soldPrice: priceSchema.optional(),
  shippingCost: priceSchema.optional().nullable(),
  shippingCollected: priceSchema.optional().nullable(),
  platform: platformSchema.optional(),
  salesTax: priceSchema.optional().nullable(),
  platformFees: priceSchema.optional().nullable(),
});

export const refundSchema = z.object({
  saleId: z.number().int().positive(),
  refundAmount: priceSchema,
  refundReason: z.string().max(2000).optional().nullable(),
  refundType: refundTypeSchema,
});

// ---------- Mileage ----------
export const createMileageSchema = z.object({
  date: dateSchema,
  miles: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .refine((v) => !isNaN(v) && v >= 0, 'Miles must be a non-negative number'),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(200).optional().nullable(),
  purpose: z.string().max(200).optional().nullable(),
});

export const updateMileageSchema = createMileageSchema.partial();

// ---------- Users ----------
export const createUserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200),
  role: userRoleSchema.default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(200).optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ---------- Setup ----------
export const setupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email'),
  password: passwordSchema,
});

// ---------- Profile ----------
export const updateProfileSchema = z.object({
  type: z.enum(['profile', 'password']),
  name: z.string().min(1).max(200).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
});

// ---------- Settings ----------
export const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyTagline: z.string().max(500).optional(),
  salesTaxRate: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? parseFloat(v) : v))
    .refine((v) => !isNaN(v) && v >= 0 && v <= 1, 'Sales tax rate must be between 0 and 1')
    .optional(),
});

// ---------- Import ----------
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().max(1_000_000, 'CSV data exceeds 1MB limit'),
  columnMappings: z.record(z.string()).optional(),
});

// ---------- Backup validation schemas ----------
export const backupUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  passwordHash: z.string(),
  name: z.string(),
  role: userRoleSchema,
  canViewAll: z.boolean(),
  isActive: z.boolean(),
  passwordChangedAt: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  createdBy: z.number().nullable().optional(),
  lastLogin: z.number().nullable().optional(),
});

export const backupItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  purchaseDate: z.number(),
  purchasePrice: z.number(),
  purchaseLocation: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: itemStatusSchema,
  notes: z.string().nullable().optional(),
  removalDate: z.number().nullable().optional(),
  metadata: z.unknown().nullable().optional(),
  ownerId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const backupSaleSchema = z.object({
  id: z.number(),
  itemId: z.number().nullable().optional(),
  soldDate: z.number(),
  soldPrice: z.number(),
  shippingCost: z.number().nullable().optional(),
  shippingCollected: z.number().nullable().optional(),
  platform: platformSchema,
  salesTax: z.number().nullable().optional(),
  platformFees: z.number().nullable().optional(),
  refundAmount: z.number().nullable().optional(),
  refundReason: z.string().nullable().optional(),
  refundType: refundTypeSchema,
  soldBy: z.number(),
  createdAt: z.number(),
});

export const backupPhotoSchema = z.object({
  id: z.number(),
  itemId: z.number(),
  filename: z.string(),
  path: z.string(),
  isPrimary: z.boolean(),
  createdAt: z.number(),
});

export const backupMileageSchema = z.object({
  id: z.number(),
  date: z.number(),
  miles: z.number(),
  fromLocation: z.string().nullable().optional(),
  toLocation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  ownerId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const backupAppConfigSchema = z.object({
  id: z.number(),
  companyName: z.string(),
  companyTagline: z.string(),
  salesTaxRate: z.number(),
  setupComplete: z.boolean(),
  updatedAt: z.number(),
});

export const backupFileSchema = z.object({
  version: z.literal(2),
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
