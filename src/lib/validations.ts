import { z } from "zod";
import {
  ALL_PLATFORMS,
  ALL_REFUND_TYPES,
  ALL_STATUSES,
  PLATFORM_LABELS,
  REFUND_TYPE_LABELS,
  STATUS_LABELS,
} from "./constants";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a digit")
  .regex(/[^a-zA-Z0-9]/, "Password must include a special character");

export const userRoleSchema = z.enum(["admin", "user"]);

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(255)
  .email("Invalid email");

export const setupSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const createUserSchema = z.object({
  email: emailSchema,
  name: z.string().min(1).max(100),
  password: passwordSchema,
  role: userRoleSchema.default("user"),
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

export const dateInputSchema = z
  .union([z.string(), z.number(), z.date()])
  .transform((v) => {
    if (v instanceof Date) return Math.floor(v.getTime() / 1000);
    if (typeof v === "number") return v;
    const d = new Date(v);
    if (isNaN(d.getTime())) throw new Error("Invalid date");
    return Math.floor(d.getTime() / 1000);
  });

export const itemStatusSchema = z.enum(
  ALL_STATUSES as [string, ...string[]]
);

export const createItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  purchaseDate: dateInputSchema,
  purchasePrice: z.coerce.number().nonnegative(),
  purchaseLocation: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  status: itemStatusSchema.optional(),
});

export const bulkStatusSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
  status: itemStatusSchema,
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1),
});

export const platformSchema = z.enum(
  ALL_PLATFORMS as [string, ...string[]]
);

export const refundTypeSchema = z.enum(
  ALL_REFUND_TYPES as [string, ...string[]]
);

export const createSaleSchema = z.object({
  itemId: z.coerce.number().int().positive().optional().nullable(),
  itemName: z.string().max(200).optional().nullable(),
  soldDate: dateInputSchema,
  soldPrice: z.coerce.number().nonnegative(),
  shippingCost: z.coerce.number().nonnegative().optional().nullable(),
  shippingCollected: z.coerce.number().nonnegative().optional().nullable(),
  platform: platformSchema,
  salesTax: z.coerce.number().nonnegative().optional().nullable(),
  platformFees: z.coerce.number().nonnegative().optional().nullable(),
  purchasePrice: z.coerce.number().nonnegative().optional().nullable(),
});

export const updateSaleSchema = z.object({
  soldDate: dateInputSchema.optional(),
  soldPrice: z.coerce.number().nonnegative().optional(),
  shippingCost: z.coerce.number().nonnegative().optional().nullable(),
  shippingCollected: z.coerce.number().nonnegative().optional().nullable(),
  platform: platformSchema.optional(),
  salesTax: z.coerce.number().nonnegative().optional().nullable(),
  platformFees: z.coerce.number().nonnegative().optional().nullable(),
});

export const updateRefundSchema = z.object({
  saleId: z.coerce.number().int().positive(),
  refundAmount: z.coerce.number().nonnegative(),
  refundReason: z.string().max(500).optional().nullable(),
  refundType: refundTypeSchema,
});

export const createMileageSchema = z.object({
  date: dateInputSchema,
  miles: z.coerce.number().nonnegative(),
  fromLocation: z.string().max(200).optional().nullable(),
  toLocation: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  vehicle: z.string().max(100).optional().nullable(),
  purpose: z.string().max(200).optional().nullable(),
});

export const updateMileageSchema = createMileageSchema.partial();

export const profileUpdateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("profile"),
    name: z.string().min(1).max(100),
  }),
  z.object({
    type: z.literal("password"),
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  }),
]);

export const settingsUpdateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  companyTagline: z.string().max(500).optional(),
  salesTaxRate: z.coerce.number().min(0).max(1).optional(),
});

export const importSchema = z.object({
  type: z.enum(["inventory", "sales", "mileage"]),
  csvData: z.string().min(1).max(1024 * 1024),
  columnMappings: z.record(z.string(), z.string()).optional(),
});

export const transferDataSchema = z.object({
  transferDataTo: z.coerce.number().int().positive(),
});

export { passwordSchema };
export { PLATFORM_LABELS, REFUND_TYPE_LABELS, STATUS_LABELS };
