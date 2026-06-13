import Papa from 'papaparse';
import type { Sale } from './schema';

/**
 * Convert sales data to CSV format for export.
 */
export function salesToCsv(salesData: (Sale & { itemName?: string; ownerName?: string })[]): string {
  const rows = salesData.map((sale) => ({
    'Sale ID': sale.id,
    'Item Name': sale.itemName || '',
    'Item ID': sale.itemId || '',
    'Sold Date': new Date(sale.soldDate * 1000).toISOString().split('T')[0],
    'Sold Price': sale.soldPrice,
    'Shipping Cost': sale.shippingCost || '',
    'Shipping Collected': sale.shippingCollected || '',
    Platform: sale.platform,
    'Sales Tax': sale.salesTax || '',
    'Platform Fees': sale.platformFees || '',
    'Refund Amount': sale.refundAmount || '',
    'Refund Reason': sale.refundReason || '',
    'Refund Type': sale.refundType,
    'Sold By': sale.ownerName || sale.soldBy,
  }));

  return Papa.unparse(rows);
}

/**
 * Convert mileage data to CSV format for export.
 */
export function mileageToCsv(mileageData: Record<string, unknown>[]): string {
  const rows = mileageData.map((entry) => ({
    Date: entry.date ? new Date((entry.date as number) * 1000).toISOString().split('T')[0] : '',
    Miles: entry.miles,
    'From Location': entry.fromLocation || '',
    'To Location': entry.toLocation || '',
    Address: entry.address || '',
    Vehicle: entry.vehicle || '',
    Purpose: entry.purpose || '',
  }));

  return Papa.unparse(rows);
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}