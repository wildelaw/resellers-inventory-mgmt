import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mileage } from '@/lib/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/api-utils';
import { dateParamToTimestamp } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/mileage/reports — aggregates for the current user only
export async function GET(req: NextRequest) {
  return withAuth(async (req, _ctx, session) => {
    const sp = req.nextUrl.searchParams;
    const startDate = dateParamToTimestamp(sp.get('startDate'));
    const endDate = dateParamToTimestamp(sp.get('endDate'));

    const conditions = [eq(mileage.ownerId, Number(session.user.id))];
    if (startDate !== null) conditions.push(gte(mileage.date, startDate));
    if (endDate !== null) conditions.push(lte(mileage.date, endDate));
    const where = and(...conditions);

    const rows = db.select().from(mileage).where(where).all();

    const totalMiles = rows.reduce((s, r) => s + r.miles, 0);
    const totalTrips = rows.length;
    const avgMiles = totalTrips > 0 ? totalMiles / totalTrips : 0;

    // By month: YYYY-MM
    const byMonth: Record<string, { miles: number; trips: number }> = {};
    for (const r of rows) {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] ??= { miles: 0, trips: 0 };
      byMonth[key].miles += r.miles;
      byMonth[key].trips += 1;
    }

    // By vehicle
    const byVehicle: Record<string, { miles: number; trips: number }> = {};
    for (const r of rows) {
      const key = r.vehicle ?? 'Unknown';
      byVehicle[key] ??= { miles: 0, trips: 0 };
      byVehicle[key].miles += r.miles;
      byVehicle[key].trips += 1;
    }

    return NextResponse.json({
      totalMiles,
      totalTrips,
      avgMiles,
      byMonth,
      byVehicle,
    });
  })(req, { params: Promise.resolve({}) });
}