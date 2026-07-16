import type { Session } from "next-auth";
import { ApiErrors } from "./api-errors";

export async function requireAuth(): Promise<Session> {
  const { auth } = await import("./auth");
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();

  const passwordChangedAt = session.user.passwordChangedAt ?? 0;
  const iat = session.user.iat ?? 0;
  if (passwordChangedAt > 0 && iat < passwordChangedAt) {
    throw ApiErrors.Unauthorized("Session invalidated");
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== "admin") throw ApiErrors.Forbidden();
  return session;
}

export function canViewAllData(session: Session): boolean {
  return session.user.role === "admin" || session.user.canViewAll === true;
}

export function canEditOthersData(session: Session): boolean {
  return session.user.role === "admin";
}

export function canManageUsers(session: Session): boolean {
  return session.user.role === "admin";
}

export function canAccessResource(
  resourceOwnerId: number,
  currentUserId: number | string,
  session: Session,
  operation: "read" | "write" = "read"
): boolean {
  if (session.user.role === "admin") return true;
  if (Number(currentUserId) === resourceOwnerId) return true;
  if (operation === "read" && session.user.canViewAll === true) return true;
  return false;
}
