import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { exportBackup } from '@/lib/backup';

export async function GET() {
  return withAuth(async (_req, _ctx, _session) => {
    const payload = await exportBackup();
    return NextResponse.json(payload, {
      headers: {
        'Content-Disposition': `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }, { requireAdmin: true })(new NextRequest('http://localhost/api/admin/backup'), { params: Promise.resolve({}) });
}
