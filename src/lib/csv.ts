import type { Sale, Item } from './schema';
import { formatDate } from './utils';

export function salesToCsv(sales: (Sale & { item?: Item | null })[]): string {
  const rows = sales.map((s) => ({
    id: s.id,
    itemId: s.itemId ?? '',
    itemName: s.item?.name ?? '',
    soldDate: formatDate(s.soldDate),
    soldPrice: s.soldPrice,
    shippingCost: s.shippingCost ?? '',
    shippingCollected: s.shippingCollected ?? 0,
    platform: s.platform,
    salesTax: s.salesTax ?? '',
    platformFees: s.platformFees ?? 0,
    refundAmount: s.refundAmount ?? 0,
    refundReason: s.refundReason ?? '',
    refundType: s.refundType,
    soldBy: s.soldBy,
  }));

  const headers = Object.keys(rows[0] ?? { id: '', itemId: '', itemName: '', soldDate: '', soldPrice: '', shippingCost: '', shippingCollected: '', platform: '', salesTax: '', platformFees: '', refundAmount: '', refundReason: '', refundType: '', soldBy: '' });
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((h) => {
      const v = (row as Record<string, unknown>)[h];
      const s = v === null || v === undefined ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csvLines.push(values.join(','));
  }
  return csvLines.join('\n');
}

export function mileageToCsv(entries: { id: number; date: number; miles: number; fromLocation: string | null; toLocation: string | null; address: string | null; vehicle: string | null; purpose: string | null }[]): string {
  const headers = ['id', 'date', 'miles', 'from', 'to', 'address', 'vehicle', 'purpose'];
  const csvLines = [headers.join(',')];
  for (const e of entries) {
    const row = [e.id, formatDate(e.date), e.miles, e.fromLocation ?? '', e.toLocation ?? '', e.address ?? '', e.vehicle ?? '', e.purpose ?? ''];
    const values = row.map((v) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    });
    csvLines.push(values.join(','));
  }
  return csvLines.join('\n');
}