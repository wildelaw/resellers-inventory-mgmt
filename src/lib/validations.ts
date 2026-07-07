import { z } from 'zod';

// ============ User schemas ============
export const userRoleSchema = z.enum(['admin', 'user']);

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a digit')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters');

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  role: userRoleSchema.default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: z.string().min(1).max(100).optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

// ============ Setup schemas ============
export const setupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: emailSchema,
  password: passwordSchema,
});

// ============ Profile schemas ============
export const updateProfileSchema = z.object({
  type: z.enum(['profile', 'password']),
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema.optional(),
}).refine((data) => {
  if (data.type === 'profile') return !!data.name;
  if (data.type === 'password') return !!data.currentPassword && !!data.newPassword;
  return false;
}, {
  message: 'Invalid profile update data',
});

// ============ Item schemas ============
export const itemStatusSchema = z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']);

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be at most 200 characters'),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]),
  purchasePrice: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Purchase price must be a non-negative number'),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]).optional(),
  purchasePrice: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Purchase price must be a non-negative number').optional(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: itemStatusSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

// ============ Sale schemas ============
export const platformSchema = z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']);
export const refundTypeSchema = z.enum(['none', 'refund_no_return', 'refund_with_return']);

export const createSaleSchema = z.object({
  itemId: z.number().int().positive().optional().nullable(),
  soldDate: z.union([z.string(), z.number()]),
  soldPrice: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Sold price must be a non-negative number'),
  shippingCost: z.union([z.string(), z.number()]).optional().nullable(),
  shippingCollected: z.union([z.string(), z.number()]).optional().default(0),
  platform: platformSchema,
  salesTax: z.union([z.string(), z.number()]).optional().nullable(),
  platformFees: z.union([z.string(), z.number()]).optional().default(0),
});

export const updateSaleSchema = z.object({
  soldDate: z.union([z.string(), z.number()]).optional(),
  soldPrice: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Sold price must be a non-negative number').optional(),
  shippingCost: z.union([z.string(), z.number()]).optional().nullable(),
  shippingCollected: z.union([z.string(), z.number()]).optional(),
  platform: platformSchema.optional(),
  salesTax: z.union([z.string(), z.number()]).optional().nullable(),
  platformFees: z.union([z.string(), z.number()]).optional(),
});

export const refundSchema = z.object({
  saleId: z.number().int().positive(),
  refundAmount: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Refund amount must be a non-negative number'),
  refundReason: z.string().max(500).optional().nullable(),
  refundType: refundTypeSchema,
});

// ============ Mileage schemas ============
export const createMileageSchema = z.object({
  date: z.union([z.string(), z.number()]),
  miles: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Miles must be a non-negative number'),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

export const updateMileageSchema = z.object({
  date: z.union([z.string(), z.number()]).optional(),
  miles: z.union([z.string(), z.number()]).refine((v) => {
    const n = Number(v);
    return !isNaN(n) && n >= 0;
  }, 'Miles must be a non-negative number').optional(),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

// ============ Bulk operations schemas ============
export const bulkStatusUpdateSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'At least one item ID is required'),
  status: itemStatusSchema,
});

// ============ Settings schemas ============
export const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyTagline: z.string().max(500).optional(),
  salesTaxRate: z.number().min(0).max(1).optional(),
});

// ============ Import schemas ============
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().max(1024 * 1024, 'CSV data must be at most 1MB'),
  columnMappings: z.record(z.string(), z.string()).optional(),
});

// ============ Backup/restore schemas ============
export const backupUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  password_hash: z.string(),
  name: z.string(),
  role: z.enum(['admin', 'user']),
  can_view_all: z.union([z.boolean(), z.number()]),
  is_active: z.union([z.boolean(), z.number()]),
  password_changed_at: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
  created_by: z.number().nullable().optional(),
  last_login: z.number().nullable().optional(),
});

export const backupItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  purchase_date: z.number(),
  purchase_price: z.number(),
  purchase_location: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']),
  notes: z.string().nullable().optional(),
  removal_date: z.number().nullable().optional(),
  metadata: z.string().nullable().optional(),
  owner_id: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const backupSaleSchema = z.object({
  id: z.number(),
  item_id: z.number().nullable().optional(),
  sold_date: z.number(),
  sold_price: z.number(),
  shipping_cost: z.number().nullable().optional(),
  shipping_collected: z.number().optional().default(0),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other']),
  sales_tax: z.number().nullable().optional(),
  platform_fees: z.number().optional().default(0),
  refund_amount: z.number().optional().default(0),
  refund_reason: z.string().nullable().optional(),
  refund_type: z.enum(['none', 'refund_no_return', 'refund_with_return']).optional().default('none'),
  sold_by: z.number(),
  created_at: z.number(),
});

export const backupPhotoSchema = z.object({
  id: z.number(),
  item_id: z.number(),
  filename: z.string(),
  path: z.string(),
  is_primary: z.union([z.boolean(), z.number()]),
  created_at: z.number(),
});

export const backupMileageSchema = z.object({
  id: z.number(),
  date: z.number(),
  miles: z.number(),
  from_location: z.string().nullable().optional(),
  to_location: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  vehicle: z.string().nullable().optional(),
  purpose: z.string().nullable().optional(),
  owner_id: z.number(),
  created_at: z.number(),
  updated_at: z.number(),
});

export const backupAppConfigSchema = z.object({
  id: z.number(),
  company_name: z.string(),
  company_tagline: z.string(),
  sales_tax_rate: z.number(),
  setup_complete: z.union([z.boolean(), z.number()]),
  updated_at: z.number(),
});

export const backupSchema = z.object({
  version: z.number(),
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