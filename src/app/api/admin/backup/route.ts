import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { buildBackup } from '@/lib/backup';

export const GET = withAuth(async () => {
  const payload = await buildBackup();
  return NextResponse.json(payload, {
    headers: {
      'Content-Disposition': 'attachment; filename="backup.json"',
      'Cache-Control': 'no-store',
    },
  });
}, { requireAdmin: true });