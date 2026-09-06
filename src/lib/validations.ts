import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const dateString = z.union([z.string(), z.number(), z.date()]).transform((v, ctx) => {
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    ctx.addIssue({ code: 'custom', message: 'Invalid date' });
    return z.NEVER;
  }
  return d;
});

const nonNegativeNumber = z.number().min(0, 'Must be non-negative');
const positiveNumber = z.number().positive('Must be positive');

const safeString = (max: number) =>
  z.string().trim().max(max, `Must be at most ${max} characters`);

export const userRoleSchema = z.enum(['admin', 'user']);

export const itemStatusSchema = z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']);
export const platformSchema = z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']);
export const refundTypeSchema = z.enum(['none', 'refund_no_return', 'refund_with_return']);

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export const createItemSchema = z.object({
  name: safeString(200).min(1, 'Name is required'),
  description: safeString(2000).nullish(),
  purchaseDate: dateString,
  purchasePrice: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(positiveNumber),
  purchaseLocation: safeString(200).nullish(),
  category: safeString(100).nullish(),
  notes: safeString(2000).nullish(),
  metadata: z.string().nullish(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  status: itemStatusSchema.optional(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one item id required'),
  status: itemStatusSchema,
});

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export const createSaleSchema = z.object({
  itemId: z.number().int().positive().nullish(),
  soldDate: dateString,
  soldPrice: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(positiveNumber),
  shippingCost: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(nonNegativeNumber).nullish(),
  shippingCollected: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(nonNegativeNumber).nullish(),
  platform: platformSchema,
  salesTax: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(nonNegativeNumber).nullish(),
  platformFees: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(nonNegativeNumber).nullish(),
});

export const updateSaleSchema = createSaleSchema.partial();

export const processRefundSchema = z.object({
  saleId: z.number().int().positive(),
  refundAmount: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(positiveNumber),
  refundReason: safeString(500).nullish(),
  refundType: z.enum(['refund_no_return', 'refund_with_return']),
});

// ---------------------------------------------------------------------------
// Mileage
// ---------------------------------------------------------------------------

export const createMileageSchema = z.object({
  date: dateString,
  miles: z.union([z.string(), z.number()]).transform((v) => Number(v)).pipe(positiveNumber),
  fromLocation: safeString(200).nullish(),
  toLocation: safeString(200).nullish(),
  address: safeString(500).nullish(),
  vehicle: safeString(100).nullish(),
  purpose: safeString(200).nullish(),
});

export const updateMileageSchema = createMileageSchema.partial();

// ---------------------------------------------------------------------------
// Users / auth
// ---------------------------------------------------------------------------

export const createUserSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(200),
  password: passwordSchema,
  name: safeString(100).min(1, 'Name is required'),
  role: userRoleSchema.optional().default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(200).optional(),
  name: safeString(100).min(1, 'Name is required').optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  type: z.literal('profile'),
  name: safeString(100).min(1, 'Name is required'),
});

export const changePasswordSchema = z.object({
  type: z.literal('password'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const profileUpdateSchema = z.union([updateProfileSchema, changePasswordSchema]);

// ---------------------------------------------------------------------------
// Setup / settings / import
// ---------------------------------------------------------------------------

export const setupAdminSchema = z.object({
  name: safeString(100).min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address').max(200),
  password: passwordSchema,
});

export const updateSettingsSchema = z.object({
  company_name: safeString(100).optional(),
  company_tagline: safeString(200).optional(),
  sales_tax_rate: z.number().min(0, 'Tax rate must be >= 0').max(1, 'Tax rate must be <= 1').optional(),
});

export const importRequestSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().min(1, 'CSV data is required').max(1024 * 1024, 'CSV data exceeds 1MB limit'),
  columnMappings: z.record(z.string(), z.string()).optional(),
});

export const csvRowLimit = 32000;