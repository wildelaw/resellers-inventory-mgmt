/**
 * Domain constants — item statuses, roles, platform enums, and the status
 * transition table. Single source of truth for status machine rules.
 */

export type UserRole = 'admin' | 'user';
export type ItemStatus = 'available' | 'listed' | 'sold' | 'returned' | 'donated' | 'discarded';
export type Platform =
  | 'local' | 'facebook' | 'instagram' | 'ebay'
  | 'poshmark' | 'mercari' | 'consignment' | 'other';
export type RefundType = 'none' | 'refund_no_return' | 'refund_with_return';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  user: 'Standard User',
};

export const DEFAULT_SALES_TAX_RATE = 0.0825;

export const ALL_STATUSES: ItemStatus[] = [
  'available', 'listed', 'sold', 'returned', 'donated', 'discarded',
];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  available: 'Available',
  listed: 'Listed',
  sold: 'Sold',
  returned: 'Returned',
  donated: 'Donated',
  discarded: 'Discarded',
};

/** Tailwind classes for status badges. */
export const STATUS_BADGE_CLASSES: Record<ItemStatus, string> = {
  available: 'bg-green-100 text-green-800',
  listed: 'bg-blue-100 text-blue-800',
  sold: 'bg-gray-100 text-gray-800',
  returned: 'bg-orange-100 text-orange-800',
  donated: 'bg-purple-100 text-purple-800',
  discarded: 'bg-red-100 text-red-800',
};

export const PLATFORMS: Platform[] = [
  'local', 'facebook', 'instagram', 'ebay', 'poshmark', 'mercari', 'consignment', 'other',
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  local: 'Local',
  facebook: 'Facebook',
  instagram: 'Instagram',
  ebay: 'eBay',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  consignment: 'Consignment',
  other: 'Other',
};

export const REFUND_TYPES: RefundType[] = ['none', 'refund_no_return', 'refund_with_return'];

export const REFUND_TYPE_LABELS: Record<RefundType, string> = {
  none: 'None',
  refund_no_return: 'Refund (no return)',
  refund_with_return: 'Refund with return',
};

/**
 * Allowed status transitions. `donated` and `discarded` are terminal.
 */
export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  available: ['listed', 'sold', 'donated', 'discarded'],
  listed: ['available', 'sold', 'donated', 'discarded'],
  sold: ['returned'],
  returned: ['available'],
  donated: [],
  discarded: [],
};

export function isValidTransition(from: ItemStatus, to: ItemStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(currentStatus: ItemStatus): ItemStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

/** True when transitioning to a terminal disposition status. */
export function isRemovalStatus(status: ItemStatus): boolean {
  return status === 'donated' || status === 'discarded';
}