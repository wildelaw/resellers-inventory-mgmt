import type { MileageEntry } from './schema';

export function mileageToCsv(entries: MileageEntry[]): string {
  const headers = ['Date', 'Miles', 'From Location', 'To Location', 'Address', 'Vehicle', 'Purpose'];
  const rows = entries.map(entry => [
    entry.date ? new Date(entry.date as any).toISOString().split('T')[0] : '',
    entry.miles.toString(),
    entry.fromLocation || '',
    entry.toLocation || '',
    entry.address || '',
    entry.vehicle || '',
    entry.purpose || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
}

export function salesToCsv(sales: any[]): string {
  const headers = ['Sale ID', 'Item ID', 'Item Name', 'Sold Date', 'Sold Price', 'Shipping Cost', 'Shipping Collected', 'Platform', 'Sales Tax', 'Platform Fees', 'Refund Amount', 'Refund Type', 'Refund Reason'];
  const rows = sales.map(sale => [
    sale.id.toString(),
    sale.itemId?.toString() || '',
    sale.item?.name || '',
    sale.soldDate ? new Date(sale.soldDate as any).toISOString().split('T')[0] : '',
    sale.soldPrice?.toString() || '0',
    sale.shippingCost?.toString() || '0',
    sale.shippingCollected?.toString() || '0',
    sale.platform || '',
    sale.salesTax?.toString() || '0',
    sale.platformFees?.toString() || '0',
    sale.refundAmount?.toString() || '0',
    sale.refundType || 'none',
    sale.refundReason || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
}