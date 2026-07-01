import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { toTimestamp } from '@/lib/utils';
import type { Session } from 'next-auth';

export const GET = withAuth(async (req: NextRequest, _ctx, session: Session) => {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const conditions = [eq(mileage.ownerId, parseInt(session.user.id, 10))];
  if (startDate) conditions.push(gte(mileage.date, toTimestamp(startDate)));
  if (endDate) conditions.push(lte(mileage.date, toTimestamp(endDate)));

  const where = and(...conditions);

  const entries = await db.query.mileage.findMany({ where });

  const totalMiles = entries.reduce((sum, e) => sum + e.miles, 0);
  const totalTrips = entries.length;
  const avgMiles = totalTrips > 0 ? totalMiles / totalTrips : 0;

  // By month
  const byMonth: Record<string, { miles: number; trips: number }> = {};
  for (const e of entries) {
    const d = new Date(e.date * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { miles: 0, trips: 0 };
    byMonth[key].miles += e.miles;
    byMonth[key].trips += 1;
  }

  // By vehicle
  const byVehicle: Record<string, { miles: number; trips: number }> = {};
  for (const e of entries) {
    const key = e.vehicle || 'Unknown';
    if (!byVehicle[key]) byVehicle[key] = { miles: 0, trips: 0 };
    byVehicle[key].miles += e.miles;
    byVehicle[key].trips += 1;
  }

  return NextResponse.json({
    totalMiles,
    totalTrips,
    avgMiles: Math.round(avgMiles * 100) / 100,
    byMonth,
    byVehicle,
  });
});