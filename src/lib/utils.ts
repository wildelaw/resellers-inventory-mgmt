/** Formatting helpers and photo URL builder. */

export function formatCurrency(value: number | null | undefined, opts?: { compact?: boolean }): string {
  const v = value === null || value === undefined ? 0 : Number(value);
  if (Number.isNaN(v)) return '$0.00';
  if (opts?.compact && Math.abs(v) >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(v);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

/** Format a unix-seconds timestamp as an ISO date (YYYY-MM-DD) in UTC. */
export function formatDate(ts: number | null | undefined): string {
  if (ts === null || ts === undefined || ts === 0) return '—';
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

/** Format a unix-seconds timestamp as a full ISO datetime string. */
export function formatDateTime(ts: number | null | undefined): string {
  if (ts === null || ts === undefined || ts === 0) return '—';
  return new Date(ts * 1000).toISOString();
}

/** Convert a "YYYY-MM-DD" string (or ISO) to unix seconds. Returns null on failure. */
export function dateToUnix(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

/** Build the authenticated photo URL for an item's photo filename. */
export function getPhotoUrl(itemId: number | string, filename: string): string {
  return `/api/photos/${itemId}/${encodeURIComponent(filename)}`;
}

/** Parse a flexible price string ("$25.00", "25", "1,234.56") to a number. */
export function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  const cleaned = String(value).replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : n;
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}