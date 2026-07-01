import { config } from './config';

export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatDate(date: number | string | Date | null | undefined): string {
  if (date === null || date === undefined) return '';
  const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: number | string | Date | null | undefined): string {
  if (date === null || date === undefined) return '';
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

export function getPhotoUrl(itemId: number, filename: string | null | undefined): string {
  if (!filename) return '';
  return `/api/photos/${itemId}/${filename}`;
}

export function toTimestamp(date: string | number | Date): number {
  if (typeof date === 'number') return date;
  const d = new Date(date);
  return Math.floor(d.getTime() / 1000);
}

export function nowTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}