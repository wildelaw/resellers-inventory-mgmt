export type UserRole = "admin" | "user";

export type ItemStatus =
  | "available"
  | "listed"
  | "sold"
  | "returned"
  | "donated"
  | "discarded";

export type Platform =
  | "local"
  | "facebook"
  | "instagram"
  | "ebay"
  | "poshmark"
  | "mercari"
  | "consignment"
  | "other";

export type RefundType = "none" | "refund_no_return" | "refund_with_return";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  user: "Standard User",
};

export const ALL_STATUSES: ItemStatus[] = [
  "available",
  "listed",
  "sold",
  "returned",
  "donated",
  "discarded",
];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  available: "Available",
  listed: "Listed",
  sold: "Sold",
  returned: "Returned",
  donated: "Donated",
  discarded: "Discarded",
};

export const ALL_PLATFORMS: Platform[] = [
  "local",
  "facebook",
  "instagram",
  "ebay",
  "poshmark",
  "mercari",
  "consignment",
  "other",
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  local: "Local",
  facebook: "Facebook",
  instagram: "Instagram",
  ebay: "eBay",
  poshmark: "Poshmark",
  mercari: "Mercari",
  consignment: "Consignment",
  other: "Other",
};

export const ALL_REFUND_TYPES: RefundType[] = [
  "none",
  "refund_no_return",
  "refund_with_return",
];

export const REFUND_TYPE_LABELS: Record<RefundType, string> = {
  none: "No Refund",
  refund_no_return: "Refund (No Return)",
  refund_with_return: "Refund (With Return)",
};

export const DEFAULT_SALES_TAX_RATE = 0.0825;

export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  available: ["listed", "sold", "donated", "discarded"],
  listed: ["available", "sold", "donated", "discarded"],
  sold: ["returned"],
  returned: ["available"],
  donated: [],
  discarded: [],
};

export function isValidTransition(
  from: ItemStatus,
  to: ItemStatus
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(currentStatus: ItemStatus): ItemStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}
