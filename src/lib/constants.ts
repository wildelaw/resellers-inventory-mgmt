export type UserRole = 'admin' | 'user';
export type ItemStatus = 'available' | 'listed' | 'sold' | 'returned' | 'donated' | 'discarded';
export type Platform = 'local' | 'facebook' | 'instagram' | 'ebay' | 'poshmark' | 'mercari' | 'consignment' | 'other';
export type RefundType = 'none' | 'refund_no_return' | 'refund_with_return';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  user: 'Standard User',
};

export const DEFAULT_SALES_TAX_RATE = 0.0825;

export const ALL_STATUSES: ItemStatus[] = [
  'available',
  'listed',
  'sold',
  'returned',
  'donated',
  'discarded',
];

export const STATUS_LABELS: Record<ItemStatus, string> = {
  available: 'Available',
  listed: 'Listed',
  sold: 'Sold',
  returned: 'Returned',
  donated: 'Donated',
  discarded: 'Discarded',
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  available: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
  listed: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
  sold: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100',
  donated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  discarded: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
};

export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  available: ['listed', 'sold', 'donated', 'discarded'],
  listed: ['available', 'sold', 'donated', 'discarded'],
  sold: ['returned'],
  returned: ['available'],
  donated: [],    // terminal
  discarded: [],  // terminal
};

export const PLATFORMS: Platform[] = [
  'local',
  'facebook',
  'instagram',
  'ebay',
  'poshmark',
  'mercari',
  'consignment',
  'other',
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  local: 'Local',
  facebook: 'Facebook Marketplace',
  instagram: 'Instagram',
  ebay: 'eBay',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  consignment: 'Consignment',
  other: 'Other',
};

export function isValidTransition(from: ItemStatus, to: ItemStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAllowedTransitions(currentStatus: ItemStatus): ItemStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}