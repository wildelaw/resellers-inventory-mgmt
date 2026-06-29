export function formatCurrency(amount: number | null | undefined): string {
  const value = amount === null || amount === undefined ? 0 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(
  date: number | string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
): string {
  if (date === null || date === undefined) return '';
  const d = typeof date === 'number' ? new Date(date) : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', opts).format(d);
}

export function formatDateTime(
  date: number | string | Date | null | undefined,
): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// URL for serving a photo via the authenticated API route
export function getPhotoUrl(itemId: number, filename: string): string {
  return `/api/photos/${itemId}/${encodeURIComponent(filename)}`;
}

export function classNames(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Convert a date string (YYYY-MM-DD) or Date to a unix timestamp in ms.
// Accepts already-numeric input passthrough.
export function toTimestamp(value: string | number | Date | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

// Parse "YYYY-MM-DD" returning a ms timestamp at start of that day (local).
export function dateParamToTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  // Accept ISO date or ISO datetime; take the date portion only
  const dateOnly = value.length > 10 ? value.slice(0, 10) : value;
  const d = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}