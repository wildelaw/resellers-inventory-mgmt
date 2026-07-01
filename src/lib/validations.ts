import { z } from 'zod';
import { ALL_STATUSES, ALL_PLATFORMS } from './constants';

// ─── Auth / Setup ────────────────────────────────────────────────────────────
export const setupSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  password: passwordSchema(),
});

export function passwordSchema() {
  return z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a digit')
    .regex(/[^A-Za-z0-9]/, 'Password must include a special character');
}

// ─── Users ───────────────────────────────────────────────────────────────────
export const userRoleSchema = z.enum(['admin', 'user']);

export const createUserSchema = z.object({
  email: z.string().email().max(200),
  password: passwordSchema(),
  name: z.string().min(1).max(200),
  role: userRoleSchema.default('user'),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().email().max(200).optional(),
  name: z.string().min(1).max(200).optional(),
  role: userRoleSchema.optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema(),
});

// ─── Profile ─────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  type: z.enum(['profile', 'password']),
  name: z.string().min(1).max(200).optional(),
  currentPassword: z.string().optional(),
  newPassword: passwordSchema().optional(),
}).refine(
  (data) => {
    if (data.type === 'profile') return data.name !== undefined;
    if (data.type === 'password') return data.currentPassword !== undefined && data.newPassword !== undefined;
    return false;
  },
  { message: 'Invalid profile update' },
);

// ─── Items ───────────────────────────────────────────────────────────────────
export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]),
  purchasePrice: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Purchase price must be non-negative' },
  ),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(ALL_STATUSES as [string, ...string[]]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
}).transform((data) => ({
  ...data,
  purchasePrice: Number(data.purchasePrice),
}));

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.union([z.string(), z.number()]).optional(),
  purchasePrice: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Purchase price must be non-negative' },
  ).optional(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(ALL_STATUSES as [string, ...string[]]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
}).transform((data) => {
  if (data.purchasePrice !== undefined) {
    return { ...data, purchasePrice: Number(data.purchasePrice) };
  }
  return data;
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
});

// ─── Sales ───────────────────────────────────────────────────────────────────
export const createSaleSchema = z.object({
  itemId: z.number().int().positive().optional().nullable(),
  soldDate: z.union([z.string(), z.number()]),
  soldPrice: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Sold price must be non-negative' },
  ),
  shippingCost: z.union([z.string(), z.number()]).optional().nullable(),
  shippingCollected: z.union([z.string(), z.number()]).optional().nullable(),
  platform: z.enum(ALL_PLATFORMS as [string, ...string[]]),
  salesTax: z.union([z.string(), z.number()]).optional().nullable(),
  platformFees: z.union([z.string(), z.number()]).optional().nullable(),
  refundAmount: z.union([z.string(), z.number()]).optional().nullable(),
  refundReason: z.string().max(500).optional().nullable(),
  refundType: z.enum(['none', 'refund_no_return', 'refund_with_return']).optional(),
}).transform((data) => ({
  ...data,
  soldPrice: Number(data.soldPrice),
  shippingCost: data.shippingCost !== undefined && data.shippingCost !== null ? Number(data.shippingCost) : null,
  shippingCollected: data.shippingCollected !== undefined && data.shippingCollected !== null ? Number(data.shippingCollected) : 0,
  salesTax: data.salesTax !== undefined && data.salesTax !== null ? Number(data.salesTax) : null,
  platformFees: data.platformFees !== undefined && data.platformFees !== null ? Number(data.platformFees) : 0,
  refundAmount: data.refundAmount !== undefined && data.refundAmount !== null ? Number(data.refundAmount) : 0,
}));

export const updateSaleSchema = z.object({
  soldDate: z.union([z.string(), z.number()]).optional(),
  soldPrice: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Sold price must be non-negative' },
  ).optional(),
  shippingCost: z.union([z.string(), z.number()]).optional().nullable(),
  shippingCollected: z.union([z.string(), z.number()]).optional().nullable(),
  platform: z.enum(ALL_PLATFORMS as [string, ...string[]]).optional(),
  salesTax: z.union([z.string(), z.number()]).optional().nullable(),
  platformFees: z.union([z.string(), z.number()]).optional().nullable(),
  refundReason: z.string().max(500).optional().nullable(),
}).transform((data) => {
  const out: Record<string, unknown> = { ...data };
  if (data.soldPrice !== undefined) out.soldPrice = Number(data.soldPrice);
  if (data.shippingCost !== undefined && data.shippingCost !== null) out.shippingCost = Number(data.shippingCost);
  if (data.shippingCollected !== undefined && data.shippingCollected !== null) out.shippingCollected = Number(data.shippingCollected);
  if (data.salesTax !== undefined && data.salesTax !== null) out.salesTax = Number(data.salesTax);
  if (data.platformFees !== undefined && data.platformFees !== null) out.platformFees = Number(data.platformFees);
  return out;
});

export const refundSchema = z.object({
  saleId: z.number().int().positive(),
  refundAmount: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Refund amount must be non-negative' },
  ),
  refundReason: z.string().max(500).optional().nullable(),
  refundType: z.enum(['refund_no_return', 'refund_with_return']),
}).transform((data) => ({
  ...data,
  refundAmount: Number(data.refundAmount),
}));

// ─── Mileage ─────────────────────────────────────────────────────────────────
export const createMileageSchema = z.object({
  date: z.union([z.string(), z.number()]),
  miles: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Miles must be non-negative' },
  ),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
}).transform((data) => ({
  ...data,
  miles: Number(data.miles),
}));

export const updateMileageSchema = z.object({
  date: z.union([z.string(), z.number()]).optional(),
  miles: z.union([z.string(), z.number()]).refine(
    (v) => Number(v) >= 0,
    { message: 'Miles must be non-negative' },
  ).optional(),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
}).transform((data) => {
  if (data.miles !== undefined) return { ...data, miles: Number(data.miles) };
  return data;
});

// ─── Settings ────────────────────────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyTagline: z.string().max(500).optional(),
  salesTaxRate: z.number().min(0).max(1).optional(),
});

// ─── Import ──────────────────────────────────────────────────────────────────
export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage']),
  csvData: z.string().max(1024 * 1024), // 1MB max
  columnMappings: z.record(z.string(), z.string()).optional(),
});