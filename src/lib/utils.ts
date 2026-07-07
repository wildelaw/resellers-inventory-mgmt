export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(amount));
}

export function formatDate(date: number | string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: number | string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getPhotoUrl(itemId: number, filename: string): string {
  return `/api/photos/${itemId}/${filename}`;
}

export function toTimestamp(date: string | number | Date): number {
  if (typeof date === 'number') {
    // If it's already a timestamp in milliseconds, convert to seconds
    if (date > 1e12) return Math.floor(date / 1000);
    return date;
  }
  const d = new Date(date);
  return Math.floor(d.getTime() / 1000);
}

export function fromTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString();
}

export function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}