import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { restoreBackup } from '@/lib/backup';
import type { Session } from 'next-auth';

export const POST = withAuth(async (req: NextRequest, _ctx, _session: Session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const result = await restoreBackup(body);
  if (!result.success) {
    return NextResponse.json({ error: 'Restore failed', details: result.errors }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}, { requireAdmin: true });