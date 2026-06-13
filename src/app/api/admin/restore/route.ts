import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { validateBackup, restoreBackup } from '@/lib/backup';

export const POST = withAuth(async (req, ctx, session) => {
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 });
  }

  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const result = validateBackup(body);
  if (!result.valid) {
    return NextResponse.json({ error: 'Invalid backup data', details: result.errors }, { status: 400 });
  }

  await restoreBackup(body);
  return NextResponse.json({ message: 'Backup restored successfully' });
});