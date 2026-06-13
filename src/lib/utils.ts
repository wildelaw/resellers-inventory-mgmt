export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | number | string | null): string {
  if (!date) return '';
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | number | string | null): string {
  if (!date) return '';
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  return d.toLocaleDateString('en-US', {
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

export function toTimestamp(date: Date | string | number): number {
  if (typeof date === 'number') return date;
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(d.getTime() / 1000);
}

export function fromTimestamp(ts: number): Date {
  return new Date(ts * 1000);
}