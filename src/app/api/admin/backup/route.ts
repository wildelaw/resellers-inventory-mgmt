import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { exportBackup } from '@/lib/backup';
import type { Session } from 'next-auth';

export const GET = withAuth(async (_req: NextRequest, _ctx, _session: Session) => {
  const backup = await exportBackup();
  return NextResponse.json(backup, {
    headers: {
      'Content-Disposition': 'attachment; filename="backup.json"',
    },
  });
}, { requireAdmin: true });