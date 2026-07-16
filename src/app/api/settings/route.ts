import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth, validateOriginOrReferer } from "@/lib/api-utils";
import { db } from "@/lib/db";
import { appConfig } from "@/lib/schema";
import { settingsUpdateSchema } from "@/lib/validations";

export const PUT = withAuth(
  async (req) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    const data = settingsUpdateSchema.parse(body);

    const now = Math.floor(Date.now() / 1000);
    const existing = await db.query.appConfig.findFirst();
    const updates: Record<string, unknown> = {
      ...(data.companyName !== undefined && { companyName: data.companyName }),
      ...(data.companyTagline !== undefined && { companyTagline: data.companyTagline }),
      ...(data.salesTaxRate !== undefined && { salesTaxRate: data.salesTaxRate }),
      updatedAt: now,
    };

    if (existing) {
      await db.update(appConfig).set(updates as never).where(eq(appConfig.id, existing.id));
    } else {
      await db.insert(appConfig).values({ id: 1, ...updates } as never);
    }

    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);
