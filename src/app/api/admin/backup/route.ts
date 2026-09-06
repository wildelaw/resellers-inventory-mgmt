import { NextResponse, type NextRequest } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { buildBackup } from '@/lib/backup';

// GET /api/admin/backup — export all tables as JSON
export const GET = withAuth(async (req, ctx, session) => {
  const backup = await buildBackup();
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}, { requireAdmin: true });