import { toCsv } from './utils';
import type { Sale, Item, Mileage } from './schema';
import { PLATFORM_LABELS, REFUND_TYPE_LABELS } from './constants';
import { calculateProfit } from './financial';
import { formatCurrency } from './utils';

export interface SaleWithItem extends Sale {
  item?: Pick<Item, 'name' | 'purchasePrice'> | null;
}

/** Serializes sales (optionally joined with their items) to CSV. */
export function salesToCsv(sales: SaleWithItem[]): string {
  const headers = [
    'Sale ID', 'Item', 'Sold Date', 'Sold Price', 'Shipping Collected',
    'Platform', 'Sales Tax', 'Platform Fees', 'Refund Amount', 'Refund Reason',
    'Refund Type', 'Profit', 'Created At',
  ];
  const rows = sales.map((s) => [
    s.id,
    s.item?.name ?? '',
    s.soldDate.toISOString(),
    s.soldPrice.toFixed(2),
    (s.shippingCollected ?? 0).toFixed(2),
    PLATFORM_LABELS[s.platform] ?? s.platform,
    (s.salesTax ?? 0).toFixed(2),
    (s.platformFees ?? 0).toFixed(2),
    (s.refundAmount ?? 0).toFixed(2),
    s.refundReason ?? '',
    REFUND_TYPE_LABELS[s.refundType ?? 'none'],
    s.item ? calculateProfit({ ...s, purchasePrice: s.item.purchasePrice }).toFixed(2) : '',
    s.createdAt.toISOString(),
  ]);
  return toCsv(headers, rows);
}

/** Serializes mileage entries to CSV. */
export function mileageToCsv(entries: Mileage[]): string {
  const headers = ['Date', 'Miles', 'From', 'To', 'Address', 'Vehicle', 'Purpose'];
  const rows = entries.map((m) => [
    m.date.toISOString(),
    m.miles,
    m.fromLocation ?? '',
    m.toLocation ?? '',
    m.address ?? '',
    m.vehicle ?? '',
    m.purpose ?? '',
  ]);
  return toCsv(headers, rows);
}

/** Builds a client-side download for CSV text (browser only). */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export { formatCurrency };