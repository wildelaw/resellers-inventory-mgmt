import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { appConfig } from "@/lib/schema";

export const POST = withAuth(
  async (req) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const now = Math.floor(Date.now() / 1000);
    const existing = await db.query.appConfig.findFirst();
    if (existing) {
      await db
        .update(appConfig)
        .set({ setupComplete: false, updatedAt: now })
        .where(eq(appConfig.id, existing.id));
    } else {
      await db.insert(appConfig).values({ id: 1, setupComplete: false, updatedAt: now });
    }
    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);
