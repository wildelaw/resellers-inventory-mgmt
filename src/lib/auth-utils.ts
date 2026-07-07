import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/**
 * Require authentication. Throws if no session or session invalidated.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();

  // Check session invalidation via passwordChangedAt
  const passwordChangedAt = (session.user as any).passwordChangedAt ?? 0;
  const iat = (session.user as any).iat ?? 0;
  if (passwordChangedAt > 0 && iat < passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }

  return session;
}

/**
 * Require admin role. Throws if not admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

/**
 * Check if the session user can view all data across users.
 * admin → always true
 * user + canViewAll → true
 * user (default) → false
 */
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

/**
 * Check if the session user can edit other users' data.
 * Only admin can edit others' data.
 */
export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if the session user can manage users.
 * Only admin can manage users.
 */
export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if the session user can access a specific resource.
 * @param resourceOwnerId - The owner ID of the resource being accessed
 * @param session - The current session
 * @param operation - 'read' or 'write'
 */
export function canAccessResource(
  resourceOwnerId: number,
  session: Session,
  operation: 'read' | 'write'
): boolean {
  const userId = Number(session.user.id);

  // Admin can always access
  if (session.user.role === 'admin') return true;

  // Owner can always access their own data
  if (resourceOwnerId === userId) return true;

  // canViewAll + read → can view all data
  if (operation === 'read' && session.user.canViewAll === true) return true;

  // canViewAll + write → only own data (already checked above)
  // Default user → only own data (already checked above)
  return false;
}