import { describe, it, expect } from "vitest";
import { validateBackup, backupSchema } from "@/lib/backup";

describe("validateBackup", () => {
  const validBackup = {
    version: 2,
    exportedAt: "2024-01-01T00:00:00.000Z",
    tables: {
      users: [
        {
          id: 1,
          email: "a@b.com",
          passwordHash: "hash",
          name: "Admin",
          role: "admin",
          canViewAll: true,
          isActive: true,
          passwordChangedAt: 0,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
      items: [],
      sales: [],
      photos: [],
      mileage: [],
      app_config: [
        {
          id: 1,
          companyName: "Co",
          companyTagline: "",
          salesTaxRate: 0.0825,
          setupComplete: true,
          updatedAt: 1000,
        },
      ],
    },
  };

  it("accepts a valid backup", () => {
    expect(() => validateBackup(validBackup)).not.toThrow();
  });

  it("rejects backup with invalid role", () => {
    const bad = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        users: [{ ...validBackup.tables.users[0], role: "power_user" }],
      },
    };
    expect(() => validateBackup(bad)).toThrow();
  });

  it("rejects backup with invalid status", () => {
    const bad = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        items: [
          {
            id: 1,
            name: "X",
            purchaseDate: 1000,
            purchasePrice: 5,
            status: "bogus",
            ownerId: 1,
            createdAt: 1000,
            updatedAt: 1000,
          },
        ],
      },
    };
    expect(() => validateBackup(bad)).toThrow();
  });

  it("rejects backup with invalid platform", () => {
    const bad = {
      ...validBackup,
      tables: {
        ...validBackup.tables,
        sales: [
          {
            id: 1,
            soldDate: 1000,
            soldPrice: 5,
            platform: "not-a-platform",
            refundType: "none",
            soldBy: 1,
            createdAt: 1000,
          },
        ],
      },
    };
    expect(() => validateBackup(bad)).toThrow();
  });

  it("coerces canViewAll/isPrimary booleans", () => {
    const r = validateBackup({
      ...validBackup,
      tables: {
        ...validBackup.tables,
        photos: [
          {
            id: 1,
            itemId: 1,
            filename: "x.jpg",
            path: "x.jpg",
            isPrimary: 1,
            createdAt: 1000,
          },
        ],
      },
    });
    expect(r.tables.photos[0].isPrimary).toBe(true);
  });

  it("requires top-level version", () => {
    expect(() =>
      validateBackup({ ...validBackup, version: undefined as unknown as number })
    ).toThrow();
  });

  it("schema rejects completely missing tables", () => {
    expect(() =>
      backupSchema.parse({ version: 2, exportedAt: "now" })
    ).toThrow();
  });
});
