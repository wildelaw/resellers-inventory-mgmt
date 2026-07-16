import type { Session } from "next-auth";
import type { UserRole } from "@/lib/constants";

export function mockSession(overrides: Partial<Session["user"]> = {}): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user: {
      id: "1",
      email: "test@example.com",
      name: "Test User",
      role: "user" as UserRole,
      canViewAll: false,
      iat: now,
      passwordChangedAt: 0,
      ...overrides,
    },
  } as Session;
}

export function adminSession(): Session {
  return mockSession({ id: "1", role: "admin", canViewAll: true });
}

export function canViewAllUserSession(): Session {
  return mockSession({ id: "2", role: "user", canViewAll: true });
}
