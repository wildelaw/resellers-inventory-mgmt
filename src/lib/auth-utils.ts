/**
 * Server-side auth helpers and RBAC predicates.
 */
import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/** Require an authenticated, non-invalidated session. Throws ApiError otherwise. */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();
  const pca = session.user.passwordChangedAt ?? 0;
  const iat = session.user.iat ?? 0;
  if (pca > 0 && iat < pca) throw ApiErrors.Unauthorized('Session invalidated');
  if (session.user.isActive === false) throw ApiErrors.Unauthorized('Account inactive');
  return session;
}

/** Require an admin session. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

// ---- RBAC predicates --------------------------------------------------------
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Determine whether the current session can access a resource owned by `ownerId`.
 *  - admin: always true
 *  - canViewAll + read: always true
 *  - canViewAll + write: own data only
 *  - default: own data only
 */
export function canAccessResource(
  ownerId: number | null | undefined,
  currentUserId: number,
  session: Session,
  operation: 'read' | 'write',
): boolean {
  if (session.user.role === 'admin') return true;
  const owner = ownerId ?? 0;
  if (owner === currentUserId) return true;
  if (operation === 'read' && session.user.canViewAll === true) return true;
  return false;
}

/** Numeric id of the current session user. */
export function currentUserId(session: Session): number {
  return parseInt(session.user.id, 10) || 0;
}