import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { withAuth, parseDateRange } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { mileageToCsv } from '@/lib/csv';

// GET /api/mileage/export — CSV download of own entries
export const GET = withAuth(async (req, ctx, session) => {
  const { startDate, endDate } = parseDateRange(req.nextUrl.searchParams);

  const conditions = [eq(mileage.ownerId, sessionUserId(session))];
  if (startDate) conditions.push(gte(mileage.date, startDate));
  if (endDate) conditions.push(lte(mileage.date, endDate));

  const rows = await db.select().from(mileage)
    .where(and(...conditions))
    .orderBy(desc(mileage.date));

  const csv = mileageToCsv(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mileage-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});