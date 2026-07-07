export function formatCurrency(amount: number | null | undefined): string {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function formatDate(
  value: number | string | Date | null | undefined,
  includeTime = false,
): string {
  if (value === null || value === undefined || value === '') return '—';
  const date =
    typeof value === 'number'
      ? new Date(value * 1000) // unix seconds → ms
      : new Date(value);
  if (isNaN(date.getTime())) return '—';
  return includeTime
    ? date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

/**
 * Build the authenticated photo URL for a stored photo.
 * Photos are served via GET /api/photos/:itemId/:filename (not a public dir).
 */
export function getPhotoUrl(itemId: number, filename: string): string {
  return `/api/photos/${itemId}/${encodeURIComponent(filename)}`;
}

/** Convert a YYYY-MM-DD date string to a unix timestamp (seconds). */
export function dateToTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  // Treat as local midnight when only a date was provided.
  return Math.floor(d.getTime() / 1000);
}

/** Convert a unix timestamp (seconds) to a YYYY-MM-DD string for <input type="date">. */
export function timestampToDateInput(value: number | null | undefined): string {
  if (!value) return '';
  const d = new Date(value * 1000);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
