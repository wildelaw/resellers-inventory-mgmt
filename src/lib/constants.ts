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
  available: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  listed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sold: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  returned: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  donated: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  discarded: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  available: ['listed', 'sold', 'donated', 'discarded'],
  listed: ['available', 'sold', 'donated', 'discarded'],
  sold: ['returned'],
  returned: ['available'],
  donated: [],
  discarded: [],
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  local: 'Local Sale',
  facebook: 'Facebook Marketplace',
  instagram: 'Instagram',
  ebay: 'eBay',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  consignment: 'Consignment',
  other: 'Other',
};

export const REFUND_TYPE_LABELS: Record<RefundType, string> = {
  none: 'No Refund',
  refund_no_return: 'Refund Without Return',
  refund_with_return: 'Refund With Return',
};

export function isValidTransition(from: ItemStatus, to: ItemStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function getAllowedTransitions(currentStatus: ItemStatus): ItemStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus];
}

export function isTerminalStatus(status: ItemStatus): boolean {
  return status === 'donated' || status === 'discarded';
}
