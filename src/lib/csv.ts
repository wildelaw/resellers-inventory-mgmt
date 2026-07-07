import { PLATFORM_LABELS, type Platform } from './constants';

/**
 * Convert sales data to CSV string.
 */
export function salesToCsv(sales: Array<Record<string, any>>): string {
  if (sales.length === 0) {
    return 'Item Name,Sold Date,Sold Price,Shipping Cost,Shipping Collected,Platform,Sales Tax,Platform Fees,Refund Amount,Refund Type,Refund Reason,Purchase Price,Profit\n';
  }

  const headers = [
    'Item Name', 'Sold Date', 'Sold Price', 'Shipping Cost',
    'Shipping Collected', 'Platform', 'Sales Tax', 'Platform Fees',
    'Refund Amount', 'Refund Type', 'Refund Reason', 'Purchase Price', 'Profit'
  ];

  const rows = sales.map(s => [
    s.itemName || '',
    s.soldDate ? new Date(s.soldDate * 1000).toLocaleDateString('en-US') : '',
    s.soldPrice ?? '',
    s.shippingCost ?? '',
    s.shippingCollected ?? '',
    PLATFORM_LABELS[s.platform as Platform] || s.platform,
    s.salesTax ?? '',
    s.platformFees ?? '',
    s.refundAmount ?? '',
    s.refundType ?? '',
    s.refundReason ?? '',
    s.purchasePrice ?? '',
    s.profit ?? '',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => {
      const str = String(cell ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));

  return csv.join('\n') + '\n';
}

/**
 * Convert mileage data to CSV string.
 */
export function mileageToCsv(entries: Array<Record<string, any>>): string {
  const headers = ['Date', 'Miles', 'From', 'To', 'Address', 'Vehicle', 'Purpose'];
  
  if (entries.length === 0) {
    return headers.join(',') + '\n';
  }

  const rows = entries.map(e => [
    e.date ? new Date(e.date * 1000).toLocaleDateString('en-US') : '',
    e.miles ?? '',
    e.fromLocation ?? '',
    e.toLocation ?? '',
    e.address ?? '',
    e.vehicle ?? '',
    e.purpose ?? '',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => {
      const str = String(cell ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','));

  return csv.join('\n') + '\n';
}