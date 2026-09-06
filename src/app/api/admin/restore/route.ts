import { NextResponse, type NextRequest } from 'next/server';
import { withAuth, validateOriginOrReferer, readJsonBody } from '@/lib/api-utils';
import { restoreBackup } from '@/lib/backup';

// POST /api/admin/restore — restore from backup (admin only).
// All rows validated before any database change; all-or-nothing transaction.
export const POST = withAuth(async (req, ctx, session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await readJsonBody(req);
  const result = await restoreBackup(body);
  return NextResponse.json({ message: 'Backup restored', ...result });
}, { requireAdmin: true });