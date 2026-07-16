import { z } from "zod";
import {
  ALL_PLATFORMS,
  ALL_REFUND_TYPES,
  ALL_STATUSES,
  PLATFORM_LABELS,
  REFUND_TYPE_LABELS,
  STATUS_LABELS,
} from "./constants";

export const userBackupRow = z.object({
  id: z.number().int().positive(),
  email: z.string().min(1).max(255),
  passwordHash: z.string().min(1),
  name: z.string().min(1).max(100),
  role: z.enum(["admin", "user"]),
  canViewAll: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
  isActive: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
  passwordChangedAt: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  createdBy: z.number().int().positive().nullable().optional(),
  lastLogin: z.number().int().nonnegative().nullable().optional(),
});

export const itemBackupRow = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  purchaseDate: z.number().int().nonnegative(),
  purchasePrice: z.number().nonnegative(),
  purchaseLocation: z.string().max(200).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  status: z.enum(ALL_STATUSES as [string, ...string[]]),
  notes: z.string().max(2000).nullable().optional(),
  removalDate: z.number().int().nonnegative().nullable().optional(),
  metadata: z.string().nullable().optional(),
  ownerId: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const saleBackupRow = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive().nullable().optional(),
  soldDate: z.number().int().nonnegative(),
  soldPrice: z.number().nonnegative(),
  shippingCost: z.number().nonnegative().nullable().optional(),
  shippingCollected: z.number().nonnegative().nullable().optional(),
  platform: z.enum(ALL_PLATFORMS as [string, ...string[]]),
  salesTax: z.number().nonnegative().nullable().optional(),
  platformFees: z.number().nonnegative().nullable().optional(),
  refundAmount: z.number().nonnegative().nullable().optional(),
  refundReason: z.string().max(500).nullable().optional(),
  refundType: z.enum(ALL_REFUND_TYPES as [string, ...string[]]),
  soldBy: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
});

export const photoBackupRow = z.object({
  id: z.number().int().positive(),
  itemId: z.number().int().positive(),
  filename: z.string().min(1).max(255),
  path: z.string().min(1).max(500),
  isPrimary: z.union([z.boolean(), z.number()]).transform((v) => Boolean(v)),
  createdAt: z.number().int().nonnegative(),
});

export const mileageBackupRow = z.object({
  id: z.number().int().positive(),
  date: z.number().int().nonnegative(),
  miles: z.number().nonnegative(),
  fromLocation: z.string().max(200).nullable().optional(),
  toLocation: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  vehicle: z.string().max(100).nullable().optional(),
  purpose: z.string().max(200).nullable().optional(),
  ownerId: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});

export const appConfigBackupRow = z.object({
  id: z.number().int().positive(),
  companyName: z.string().min(1).max(200),
  companyTagline: z.string().max(500),
  salesTaxRate: z.number().min(0).max(1),
  setupComplete: z
    .union([z.boolean(), z.number()])
    .transform((v) => Boolean(v)),
  updatedAt: z.number().int().nonnegative(),
});

export const backupSchema = z.object({
  version: z.number().int().min(1),
  exportedAt: z.string(),
  tables: z.object({
    users: z.array(userBackupRow),
    items: z.array(itemBackupRow),
    sales: z.array(saleBackupRow),
    photos: z.array(photoBackupRow),
    mileage: z.array(mileageBackupRow),
    app_config: z.array(appConfigBackupRow),
  }),
});

export type BackupData = z.infer<typeof backupSchema>;
export type ValidatedBackup = {
  version: number;
  exportedAt: string;
  tables: {
    users: z.infer<typeof userBackupRow>[];
    items: z.infer<typeof itemBackupRow>[];
    sales: z.infer<typeof saleBackupRow>[];
    photos: z.infer<typeof photoBackupRow>[];
    mileage: z.infer<typeof mileageBackupRow>[];
    app_config: z.infer<typeof appConfigBackupRow>[];
  };
};

export function validateBackup(input: unknown): ValidatedBackup {
  return backupSchema.parse(input) as ValidatedBackup;
}
