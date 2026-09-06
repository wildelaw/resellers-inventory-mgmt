import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { withAuth, parseDateRange } from '@/lib/api-utils';
import { sessionUserId } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';

// GET /api/mileage/reports — totals, averages, by-month and by-vehicle breakdowns
export const GET = withAuth(async (req, ctx, session) => {
  const { startDate, endDate } = parseDateRange(req.nextUrl.searchParams);

  const conditions = [eq(mileage.ownerId, sessionUserId(session))];
  if (startDate) conditions.push(gte(mileage.date, startDate));
  if (endDate) conditions.push(lte(mileage.date, endDate));
  const where = and(...conditions);

  const [totals] = await db
    .select({
      totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
      totalTrips: sql<number>`count(*)`,
      avgMiles: sql<number>`coalesce(avg(${mileage.miles}), 0)`,
    })
    .from(mileage)
    .where(where);

  const byMonth = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${mileage.date} / 1000, 'unixepoch')`,
      totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
      trips: sql<number>`count(*)`,
    })
    .from(mileage)
    .where(where)
    .groupBy(sql`strftime('%Y-%m', ${mileage.date} / 1000, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m', ${mileage.date} / 1000, 'unixepoch')`);

  const byVehicle = await db
    .select({
      vehicle: sql<string>`coalesce(${mileage.vehicle}, 'Unspecified')`,
      totalMiles: sql<number>`coalesce(sum(${mileage.miles}), 0)`,
      trips: sql<number>`count(*)`,
    })
    .from(mileage)
    .where(where)
    .groupBy(sql`coalesce(${mileage.vehicle}, 'Unspecified')`);

  const totalTrips = Number(totals.totalTrips);

  return NextResponse.json({
    summary: {
      totalMiles: Number(totals.totalMiles),
      totalTrips,
      averageMilesPerTrip: totalTrips > 0 ? Number(totals.avgMiles) : 0,
    },
    byMonth: byMonth.map((r) => ({ month: r.month, totalMiles: Number(r.totalMiles), trips: Number(r.trips) })),
    byVehicle: byVehicle.map((r) => ({ vehicle: r.vehicle, totalMiles: Number(r.totalMiles), trips: Number(r.trips) })),
  });
});