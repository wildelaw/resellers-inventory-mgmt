import { z } from 'zod';

// ---------- helpers ----------

const priceSchema = z.coerce.number().finite().nonnegative().max(1_000_000);
const optionalPriceSchema = z.coerce.number().finite().nonnegative().max(1_000_000).optional().nullable();
const intIdSchema = z.coerce.number().int().positive().max(2_147_483_647);

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: 'Invalid email address' })
  .max(254);

// Password: 8-128 chars, uppercase, lowercase, digit, special char
const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(128, { message: 'Password must be at most 128 characters' })
  .refine((v) => /[A-Z]/.test(v), { message: 'Password must include an uppercase letter' })
  .refine((v) => /[a-z]/.test(v), { message: 'Password must include a lowercase letter' })
  .refine((v) => /[0-9]/.test(v), { message: 'Password must include a digit' })
  .refine((v) => /[^A-Za-z0-9]/.test(v), { message: 'Password must include a special character' });

// ---------- auth / user ----------

export const userRoleSchema = z.enum(['admin', 'user']);

export const setupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1).max(200),
  role: userRoleSchema.default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().trim().min(1).max(200).optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  type: z.literal('profile'),
  name: z.string().trim().min(1).max(200).optional(),
});

export const changePasswordSchema = z.object({
  type: z.literal('password'),
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const profileUpdateSchema = z.discriminatedUnion('type', [
  updateProfileSchema,
  changePasswordSchema,
]);

// ---------- items ----------

const itemStatusSchema = z.enum([
  'available', 'listed', 'sold', 'returned', 'donated', 'discarded',
]);

const metadataSchema = z
  .string()
  .max(10_000)
  .optional()
  .nullable()
  .or(z.record(z.string(), z.unknown()).optional().nullable());

const dateLikeSchema = z.union([z.string(), z.number(), z.date()]);

export const createItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: dateLikeSchema,
  purchasePrice: priceSchema,
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: metadataSchema,
});

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: dateLikeSchema.optional(),
  purchasePrice: priceSchema.optional(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: itemStatusSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: metadataSchema,
  removalDate: z.union([dateLikeSchema, z.null()]).optional(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(intIdSchema).min(1).max(1000),
  status: itemStatusSchema,
});

export const bulkDeleteSchema = z.object({
  ids: z.array(intIdSchema).min(1).max(1000),
});

// ---------- sales ----------

const platformSchema = z.enum([
  'local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other',
]);
const refundTypeSchema = z.enum(['none', 'refund_no_return', 'refund_with_return']);

export const createSaleSchema = z.object({
  itemId: intIdSchema.optional().nullable(),
  soldDate: dateLikeSchema,
  soldPrice: priceSchema,
  shippingCost: optionalPriceSchema,
  shippingCollected: optionalPriceSchema.optional().nullable().default(0),
  platform: platformSchema,
  salesTax: optionalPriceSchema,
  platformFees: optionalPriceSchema.optional().nullable().default(0),
  refundAmount: optionalPriceSchema.optional().nullable().default(0),
  refundReason: z.string().max(2000).optional().nullable(),
  refundType: refundTypeSchema.optional().nullable().default('none'),
});

export const updateSaleSchema = z.object({
  itemId: intIdSchema.optional().nullable(),
  soldDate: dateLikeSchema.optional(),
  soldPrice: priceSchema.optional(),
  shippingCost: optionalPriceSchema.optional(),
  shippingCollected: optionalPriceSchema.optional(),
  platform: platformSchema.optional(),
  salesTax: optionalPriceSchema.optional(),
  platformFees: optionalPriceSchema.optional(),
  refundAmount: optionalPriceSchema.optional(),
  refundReason: z.string().max(2000).optional().nullable(),
  refundType: refundTypeSchema.optional(),
});

export const refundSchema = z.object({
  saleId: intIdSchema,
  refundAmount: priceSchema,
  refundReason: z.string().max(2000).optional().nullable(),
  refundType: z.enum(['refund_no_return', 'refund_with_return']),
});

// ---------- mileage ----------

export const createMileageSchema = z.object({
  date: dateLikeSchema,
  miles: z.coerce.number().finite().nonnegative().max(100_000),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(200).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

export const updateMileageSchema = z.object({
  date: dateLikeSchema.optional(),
  miles: z.coerce.number().finite().nonnegative().max(100_000).optional(),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(200).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

// ---------- settings ----------

export const updateSettingsSchema = z.object({
  companyName: z.string().trim().max(200).optional(),
  companyTagline: z.string().trim().max(500).optional(),
  salesTaxRate: z.coerce.number().min(0).max(1).optional(),
});

// ---------- import ----------

export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().min(1).max(1_048_576), // 1MB
  columnMappings: z.record(z.string(), z.string()).optional(),
});

// ---------- backup/restore ----------

const timestampSchema = z.coerce.number().int().nonnegative();

export const backupUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().max(254),
  passwordHash: z.string(),
  name: z.string().max(200),
  role: userRoleSchema,
  canViewAll: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  passwordChangedAt: timestampSchema.default(0),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  createdBy: z.number().int().nullable().optional(),
  lastLogin: timestampSchema.nullable().optional(),
});

export const backupItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().max(200),
  description: z.string().max(2000).nullable().optional(),
  purchaseDate: timestampSchema,
  purchasePrice: z.coerce.number(),
  purchaseLocation: z.string().max(200).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  status: itemStatusSchema,
  notes: z.string().max(2000).nullable().optional(),
  removalDate: timestampSchema.nullable().optional(),
  metadata: z.string().nullable().optional(),
  ownerId: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const backupSaleSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().nullable().optional(),
  soldDate: timestampSchema,
  soldPrice: z.coerce.number(),
  shippingCost: z.coerce.number().nullable().optional(),
  shippingCollected: z.coerce.number().optional().default(0),
  platform: platformSchema,
  salesTax: z.coerce.number().nullable().optional(),
  platformFees: z.coerce.number().optional().default(0),
  refundAmount: z.coerce.number().optional().default(0),
  refundReason: z.string().nullable().optional(),
  refundType: refundTypeSchema.optional().default('none'),
  soldBy: z.number().int(),
  createdAt: timestampSchema,
});

export const backupPhotoSchema = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int(),
  filename: z.string(),
  path: z.string(),
  isPrimary: z.coerce.boolean().default(false),
  createdAt: timestampSchema,
});

export const backupMileageSchema = z.object({
  id: z.number().int().positive(),
  date: timestampSchema,
  miles: z.coerce.number(),
  fromLocation: z.string().nullable().optional(),
  toLocation: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  ownerId: z.number().int(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const backupAppConfigSchema = z.object({
  id: z.number().int().positive().default(1),
  companyName: z.string().optional(),
  companyTagline: z.string().optional(),
  salesTaxRate: z.coerce.number().optional(),
  setupComplete: z.coerce.boolean().default(false),
  updatedAt: timestampSchema,
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

export type BackupFile = z.infer<typeof backupFileSchema>;