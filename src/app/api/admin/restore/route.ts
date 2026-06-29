import { NextResponse } from 'next/server';
import { withAuth, validateOriginOrReferer } from '@/lib/api-utils';
import { validateBackup, restoreBackup, buildBackup } from '@/lib/backup';

export const POST = withAuth(async (req, _ctx, _session) => {
  const originError = validateOriginOrReferer(req);
  if (originError) return originError;

  const body = await req.json();
  const errors = validateBackup(body);
  if (errors) {
    return NextResponse.json(
      { error: 'Backup validation failed', code: 'BAD_REQUEST', details: errors },
      { status: 400 },
    );
  }
  const result = await restoreBackup(body as Awaited<ReturnType<typeof buildBackup>>);
  return NextResponse.json({ success: true, counts: result.counts });
}, { requireAdmin: true });