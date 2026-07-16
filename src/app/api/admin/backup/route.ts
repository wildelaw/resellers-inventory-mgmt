import { NextResponse, type NextRequest } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { users, items, sales, photos, mileage, appConfig } from "@/lib/schema";

export const GET = withAuth(
  async (_req, _ctx) => {
    const [u, i, s, p, m, c] = await Promise.all([
      db.select().from(users),
      db.select().from(items),
      db.select().from(sales),
      db.select().from(photos),
      db.select().from(mileage),
      db.select().from(appConfig),
    ]);

    return NextResponse.json({
      version: 2,
      exportedAt: new Date().toISOString(),
      tables: {
        users: u,
        items: i,
        sales: s,
        photos: p,
        mileage: m,
        app_config: c,
      },
    });
  },
  { requireAdmin: true }
);
