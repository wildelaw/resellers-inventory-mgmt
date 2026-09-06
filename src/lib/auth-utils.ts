import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/** Returns the current session or throws 401. Also enforces passwordChangedAt invalidation. */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();

  // Check if the session was issued before the user's last password change
  if (session.user.passwordChangedAt > 0 &&
      (session.user.iat || 0) < session.user.passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }

  return session;
}

/** Returns the current admin session or throws 401/403. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

// ---------------------------------------------------------------------------
// RBAC helpers
// ---------------------------------------------------------------------------

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
 * Whether the current user may access a resource owned by `resourceOwnerId`.
 * `operation` is 'read' or 'write'.
 */
export function canAccessResource(
  resourceOwnerId: number,
  currentUserId: number,
  session: Session,
  operation: 'read' | 'write'
): boolean {
  if (session.user.role === 'admin') return true;
  const isOwn = resourceOwnerId === currentUserId;
  if (session.user.canViewAll === true) {
    return operation === 'read' ? true : isOwn;
  }
  return isOwn;
}

/** Numeric user id from a session. */
export function sessionUserId(session: Session): number {
  return Number(session.user.id);
}