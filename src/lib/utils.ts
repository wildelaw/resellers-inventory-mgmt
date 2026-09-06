import { config } from './config';
import type { Photo } from './schema';

export function formatCurrency(amount: number | null | undefined): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount ?? 0);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Public URL for a stored photo. Photos live outside the public directory and
 * are served through the authenticated /api/photos route.
 */
export function getPhotoUrl(photo: Pick<Photo, 'itemId' | 'filename'>): string {
  return `/api/photos/${photo.itemId}/${encodeURIComponent(photo.filename)}`;
}

export function getUploadsDir(): string {
  return config.uploads.path;
}

export function toItemUploadDir(itemId: number | string): string {
  return `${config.uploads.path}/items/${itemId}`;
}

/** Escape a value destined for a CSV cell. */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsvValue).join(',')];
  for (const row of rows) {
    lines.push(row.map(escapeCsvValue).join(','));
  }
  return lines.join('\n');
}