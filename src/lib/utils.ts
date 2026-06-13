import { config } from './config';

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(timestamp: number | null | undefined): string {
  if (timestamp == null) return '';
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp: number | null | undefined): string {
  if (timestamp == null) return '';
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getPhotoUrl(itemId: number, filename: string): string {
  return `/api/photos/${itemId}/${filename}`;
}

export function parseDateParam(value: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
}

export function toTimestamp(date: Date | string | number): number {
  if (typeof date === 'number') return date;
  if (typeof date === 'string') return Math.floor(new Date(date).getTime() / 1000);
  return Math.floor(date.getTime() / 1000);
}