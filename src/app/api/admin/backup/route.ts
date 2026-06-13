import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { exportBackup } from '@/lib/backup';

export const GET = withAuth(async (_req, _ctx, _session) => {
  const backup = await exportBackup();

  return NextResponse.json(backup, {
    headers: {
      'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}, { requireAdmin: true });