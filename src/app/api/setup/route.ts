import { NextResponse, type NextRequest } from "next/server";
import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";
import { db, getRawSqlite } from "@/lib/db";
import { appConfig, users, items, sales, photos, mileage } from "@/lib/schema";
import { setupSchema } from "@/lib/validations";
import { ApiErrors, handleApiError } from "@/lib/api-errors";
import { runMigrations } from "@/lib/migrate";
import { getSetupStatus } from "@/lib/db-init";
import { validateOriginOrReferer } from "@/lib/api-utils";
import { validateBackup } from "@/lib/backup";
import { withAuth } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    runMigrations();

    const status = await getSetupStatus();
    if (status.hasUsers) {
      const config = await db.query.appConfig.findFirst();
      if (config?.setupComplete) {
        throw ApiErrors.Forbidden("Setup is already complete");
      }
    }

    const body = await req.json();
    const data = setupSchema.parse(body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase().trim()),
    });
    if (existing) {
      throw ApiErrors.Conflict("Email already in use");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const now = Math.floor(Date.now() / 1000);

    const inserted = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase().trim(),
        name: data.name,
        passwordHash,
        role: "admin",
        canViewAll: true,
        isActive: true,
        passwordChangedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const existingConfig = await db.query.appConfig.findFirst();
    if (existingConfig) {
      await db
        .update(appConfig)
        .set({
          setupComplete: true,
          updatedAt: now,
        })
        .where(eq(appConfig.id, existingConfig.id));
    } else {
      await db.insert(appConfig).values({
        id: 1,
        setupComplete: true,
        companyName: "Resale Manager",
        companyTagline: "",
        salesTaxRate: 0.0825,
        updatedAt: now,
      });
    }

    return NextResponse.json(
      {
        message: "Admin account created",
        user: {
          id: String(inserted[0].id),
          email: inserted[0].email,
          name: inserted[0].name,
          role: inserted[0].role,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export const PUT = withAuth(
  async (req) => {
    const originError = validateOriginOrReferer(req);
    if (originError) return originError;

    const body = await req.json();
    let backup;
    try {
      backup = validateBackup(body);
    } catch (err) {
      if (err instanceof Error && err.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid backup: " + (err as unknown as { issues: { message: string }[] }).issues.map((i) => i.message).join("; ") },
          { status: 400 }
        );
      }
      throw err;
    }

    const sqlite = getRawSqlite();
    sqlite.exec("PRAGMA foreign_keys = OFF");
    try {
      db.transaction((tx) => {
        tx.delete(photos).run();
        tx.delete(sales).run();
        tx.delete(mileage).run();
        tx.delete(items).run();
        tx.delete(users).run();
        tx.delete(appConfig).run();
      });

      if (backup.tables.app_config.length > 0) {
        for (const row of backup.tables.app_config) {
          db.insert(appConfig).values({
            id: row.id,
            companyName: row.companyName,
            companyTagline: row.companyTagline,
            salesTaxRate: row.salesTaxRate,
            setupComplete: row.setupComplete,
            updatedAt: row.updatedAt,
          }).run();
        }
      } else {
        db.insert(appConfig).values({ id: 1 }).run();
      }

      for (const u of backup.tables.users) {
        db.insert(users).values({
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          role: u.role,
          canViewAll: u.canViewAll,
          isActive: u.isActive,
          passwordChangedAt: u.passwordChangedAt,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          createdBy: u.createdBy ?? null,
          lastLogin: u.lastLogin ?? null,
        }).run();
      }

      for (const i of backup.tables.items) {
        db.insert(items).values({
          id: i.id,
          name: i.name,
          description: i.description ?? null,
          purchaseDate: i.purchaseDate,
          purchasePrice: i.purchasePrice,
          purchaseLocation: i.purchaseLocation ?? null,
          category: i.category ?? null,
          status: i.status as never,
          notes: i.notes ?? null,
          removalDate: i.removalDate ?? null,
          metadata: i.metadata ?? null,
          ownerId: i.ownerId,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
        }).run();
      }
      for (const s of backup.tables.sales) {
        db.insert(sales).values({
          id: s.id,
          itemId: s.itemId ?? null,
          soldDate: s.soldDate,
          soldPrice: s.soldPrice,
          shippingCost: s.shippingCost ?? null,
          shippingCollected: s.shippingCollected ?? null,
          platform: s.platform as never,
          salesTax: s.salesTax ?? null,
          platformFees: s.platformFees ?? null,
          refundAmount: s.refundAmount ?? null,
          refundReason: s.refundReason ?? null,
          refundType: s.refundType as never,
          soldBy: s.soldBy,
          createdAt: s.createdAt,
        }).run();
      }
      for (const p of backup.tables.photos) {
        db.insert(photos).values({
          id: p.id,
          itemId: p.itemId,
          filename: p.filename,
          path: p.path,
          isPrimary: p.isPrimary,
          createdAt: p.createdAt,
        }).run();
      }
      for (const m of backup.tables.mileage) {
        db.insert(mileage).values({
          id: m.id,
          date: m.date,
          miles: m.miles,
          fromLocation: m.fromLocation ?? null,
          toLocation: m.toLocation ?? null,
          address: m.address ?? null,
          vehicle: m.vehicle ?? null,
          purpose: m.purpose ?? null,
          ownerId: m.ownerId,
          createdAt: m.createdAt,
          updatedAt: m.updatedAt,
        }).run();
      }
    } finally {
      sqlite.exec("PRAGMA foreign_keys = ON");
    }

    return NextResponse.json({ success: true });
  },
  { requireAdmin: true }
);
