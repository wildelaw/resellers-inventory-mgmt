import { describe, it, expect } from "vitest";
import {
  canViewAllData,
  canEditOthersData,
  canManageUsers,
  canAccessResource,
} from "@/lib/auth-utils";
import { adminSession, canViewAllUserSession, mockSession } from "../helpers/session";

describe("RBAC helpers", () => {
  it("admin can view all", () => {
    expect(canViewAllData(adminSession())).toBe(true);
  });
  it("user+canViewAll can view all", () => {
    expect(canViewAllData(canViewAllUserSession())).toBe(true);
  });
  it("regular user cannot view all", () => {
    expect(canViewAllData(mockSession())).toBe(false);
  });

  it("only admin can edit others", () => {
    expect(canEditOthersData(adminSession())).toBe(true);
    expect(canEditOthersData(canViewAllUserSession())).toBe(false);
    expect(canEditOthersData(mockSession())).toBe(false);
  });

  it("only admin can manage users", () => {
    expect(canManageUsers(adminSession())).toBe(true);
    expect(canManageUsers(canViewAllUserSession())).toBe(false);
    expect(canManageUsers(mockSession())).toBe(false);
  });

  it("admin can access any resource", () => {
    expect(canAccessResource(99, 1, adminSession(), "read")).toBe(true);
    expect(canAccessResource(99, 1, adminSession(), "write")).toBe(true);
  });

  it("user can access own resource", () => {
    expect(canAccessResource(1, 1, mockSession({ id: "1" }), "write")).toBe(true);
  });

  it("user cannot access others' resources", () => {
    expect(canAccessResource(2, 1, mockSession({ id: "1" }), "read")).toBe(false);
    expect(canAccessResource(2, 1, mockSession({ id: "1" }), "write")).toBe(false);
  });

  it("canViewAll user can read others", () => {
    expect(canAccessResource(2, 1, canViewAllUserSession(), "read")).toBe(true);
  });

  it("canViewAll user cannot write to others", () => {
    expect(canAccessResource(2, 1, canViewAllUserSession(), "write")).toBe(false);
  });
});
