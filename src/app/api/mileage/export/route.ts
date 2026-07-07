import { NextRequest, NextResponse } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { withAuth } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { mileageToCsv } from '@/lib/csv';

export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const uid = sessionUserId(session);
    const conditions = [eq(mileage.ownerId, uid)];
    const startDate = sp.get('startDate');
    if (startDate) {
      const ts = Math.floor(new Date(startDate).getTime() / 1000);
      if (!isNaN(ts)) conditions.push(gte(mileage.date, ts));
    }
    const endDate = sp.get('endDate');
    if (endDate) {
      const ts = Math.floor(new Date(endDate).getTime() / 1000) + 86400;
      if (!isNaN(ts)) conditions.push(lte(mileage.date, ts));
    }

    const rows = await db.query.mileage.findMany({
      where: and(...conditions),
      orderBy: (mileage, { desc }) => [desc(mileage.date)],
    });

    const csv = mileageToCsv(rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="mileage-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  })(req, { params: Promise.resolve({}) });
}
