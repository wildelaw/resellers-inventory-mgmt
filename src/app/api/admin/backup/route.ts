import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { buildBackup } from '@/lib/backup';

export const dynamic = 'force-dynamic';

// GET /api/admin/backup — export all tables as JSON
export async function GET() {
  return withAuth(async (req, _ctx, _session) => {
    const backup = buildBackup();
    return NextResponse.json(backup, {
      headers: {
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString()}.json"`,
      },
    });
  }, { requireAdmin: true })(new NextRequest('http://localhost/api/admin/backup'), { params: Promise.resolve({}) });
}