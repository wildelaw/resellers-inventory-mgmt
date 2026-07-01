import type { Sale } from './schema';
import { formatDate, formatCurrency } from './utils';

/**
 * Convert sales data to CSV format
 */
export function salesToCsv(sales: Array<Sale & { 
  item?: { name: string; purchasePrice: number } | null;
  seller?: { name: string } | null;
}>): string {
  const headers = [
    'Sale ID',
    'Item Name',
    'Sold Date',
    'Sold Price',
    'Purchase Price',
    'Profit',
    'Platform',
    'Shipping Cost',
    'Shipping Collected',
    'Sales Tax',
    'Platform Fees',
    'Refund Amount',
    'Refund Type',
    'Sold By',
  ];

  const rows = sales.map(sale => {
    const profit = sale.item 
      ? (sale.soldPrice + (sale.shippingCollected || 0)) -
        (sale.salesTax || 0) -
        (sale.platformFees || 0) -
        (sale.refundAmount || 0) -
        sale.item.purchasePrice -
        (sale.shippingCost || 0)
      : 0;

    return [
      sale.id,
      sale.item?.name || 'N/A',
      formatDate(sale.soldDate),
      sale.soldPrice,
      sale.item?.purchasePrice || 0,
      profit.toFixed(2),
      sale.platform,
      sale.shippingCost || 0,
      sale.shippingCollected || 0,
      sale.salesTax || 0,
      sale.platformFees || 0,
      sale.refundAmount || 0,
      sale.refundType,
      sale.seller?.name || 'Unknown',
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      // Escape cells containing commas or quotes
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Convert mileage data to CSV format
 */
export function mileageToCsv(mileage: Array<{
  id: number;
  date: Date | number;
  miles: number;
  fromLocation?: string | null;
  toLocation?: string | null;
  address?: string | null;
  vehicle?: string | null;
  purpose?: string | null;
}>): string {
  const headers = [
    'Date',
    'Miles',
    'From',
    'To',
    'Address',
    'Vehicle',
    'Purpose',
  ];

  const rows = mileage.map(entry => [
    formatDate(entry.date),
    entry.miles,
    entry.fromLocation || '',
    entry.toLocation || '',
    entry.address || '',
    entry.vehicle || '',
    entry.purpose || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Trigger a CSV download in the browser
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
