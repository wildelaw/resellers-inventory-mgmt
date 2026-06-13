import { z } from 'zod';

import type { ItemStatus, SalePlatform, RefundType, UserRole } from './constants';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const setupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
});

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,128}$/;
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(passwordRegex, 'Password must include uppercase, lowercase, digit, and special character');

export const createItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchasePrice: z.coerce.number().positive('Purchase price must be positive'),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded'] as const).optional().default('available'),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.any().optional().nullable(),
});

export const updateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().positive().optional(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded'] as const).optional(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.any().optional().nullable(),
  removalDate: z.string().optional().nullable(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, 'At least one item ID is required'),
  status: z.enum(['available', 'listed', 'sold', 'returned', 'donated', 'discarded'] as const),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
});

export const createSaleSchema = z.object({
  itemId: z.coerce.number().int().positive().optional().nullable(),
  soldDate: z.string().min(1, 'Sale date is required'),
  soldPrice: z.coerce.number().positive('Sale price must be positive'),
  shippingCost: z.coerce.number().min(0).optional().nullable(),
  shippingCollected: z.coerce.number().min(0).optional().nullable(),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other'] as const),
  salesTax: z.coerce.number().min(0).optional().nullable(),
  platformFees: z.coerce.number().min(0).optional().nullable(),
});

export const updateSaleSchema = z.object({
  soldDate: z.string().optional(),
  soldPrice: z.coerce.number().positive().optional(),
  shippingCost: z.coerce.number().min(0).optional().nullable(),
  shippingCollected: z.coerce.number().min(0).optional().nullable(),
  platform: z.enum(['local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other'] as const).optional(),
  salesTax: z.coerce.number().min(0).optional().nullable(),
  platformFees: z.coerce.number().min(0).optional().nullable(),
});

export const refundSchema = z.object({
  saleId: z.coerce.number().int().positive('Sale ID is required'),
  refundAmount: z.coerce.number().min(0, 'Refund amount must be non-negative'),
  refundReason: z.string().max(500).optional().nullable(),
  refundType: z.enum(['refund_no_return', 'refund_with_return'] as const),
});

export const createMileageSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  miles: z.coerce.number().positive('Miles must be positive'),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

export const updateMileageSchema = z.object({
  date: z.string().optional(),
  miles: z.coerce.number().positive().optional(),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(500).optional().nullable(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required').max(200),
  role: z.enum(['admin', 'user'] as const),
  canViewAll: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(200).optional(),
  role: z.enum(['admin', 'user'] as const).optional(),
  canViewAll: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const changePasswordSchema = z.object({
  type: z.literal('password'),
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const profileUpdateSchema = z.union([
  z.object({ type: z.literal('profile'), name: z.string().min(1).max(200) }),
  changePasswordSchema,
]);

export const settingsSchema = z.object({
  companyName: z.string().max(200).optional(),
  companyTagline: z.string().max(500).optional(),
  salesTaxRate: z.number().min(0).max(1).optional(),
});

export const importSchema = z.object({
  type: z.enum(['inventory', 'sales', 'mileage'] as const),
  csvData: z.string().min(1, 'CSV data is required').max(1048576, 'CSV data must be less than 1MB'),
  columnMappings: z.record(z.string(), z.string()).optional(),
});

export const deletePhotoSchema = z.object({
  photoId: z.coerce.number().int().positive(),
});

export const photoUploadSchema = z.object({
  photo: z.any(),
});

export const transferDataSchema = z.object({
  transferDataTo: z.coerce.number().int().positive().optional(),
});