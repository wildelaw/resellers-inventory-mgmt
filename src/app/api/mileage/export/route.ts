import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { toTimestamp } from '@/lib/utils';
import { mileageToCsv } from '@/lib/csv';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const conditions = [eq(mileage.ownerId, parseInt(session.user.id, 10))];
  if (startDate) conditions.push(gte(mileage.date, toTimestamp(startDate)));
  if (endDate) conditions.push(lte(mileage.date, toTimestamp(endDate)));

  const entries = await db.query.mileage.findMany({ where: and(...conditions) });

  const csv = mileageToCsv(entries);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="mileage-export.csv"',
    },
  });
});