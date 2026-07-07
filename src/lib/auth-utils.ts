import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/** Require an authenticated session (throws ApiError otherwise). */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();
  const pca = (session.user as { passwordChangedAt?: number }).passwordChangedAt ?? 0;
  const iat = (session.user as { iat?: number }).iat ?? 0;
  if (pca > 0 && iat < pca) throw ApiErrors.Unauthorized('Session invalidated');
  return session;
}

/** Require an admin session. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

/** Whether the session can view all users' data (admin or canViewAll user). */
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || (session.user as { canViewAll: boolean }).canViewAll === true;
}

/** Whether the session can edit data owned by other users (admin only). */
export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

/** Whether the session can manage users (admin only). */
export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Decide whether the current session may access a resource owned by `ownerId`.
 * - admin → always allowed
 * - canViewAll + read → allowed for any owner
 * - otherwise → only own resources
 */
export function canAccessResource(
  ownerId: number,
  session: Session,
  operation: 'read' | 'write',
): boolean {
  const currentId = Number(session.user.id);
  if (session.user.role === 'admin') return true;
  if (ownerId === currentId) return true;
  if (operation === 'read' && canViewAllData(session)) return true;
  return false;
}

/** Parse the numeric user id from a session. */
export function sessionUserId(session: Session): number {
  return Number(session.user.id);
}
