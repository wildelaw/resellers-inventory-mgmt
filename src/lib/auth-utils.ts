import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/**
 * Require authenticated session. Throws 401 if not authenticated.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();

  // Check session invalidation via passwordChangedAt
  const passwordChangedAt = (session.user as Record<string, unknown>).passwordChangedAt as number;
  const iat = (session.user as Record<string, unknown>).iat as number;
  if (passwordChangedAt > 0 && (iat || 0) < passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }

  return session;
}

/**
 * Require admin session. Throws 401 if not authenticated, 403 if not admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

/**
 * Check if session user can view all data (admin or canViewAll).
 */
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

/**
 * Check if session user can edit others' data (admin only).
 */
export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if session user can manage users (admin only).
 */
export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if a user can access a resource based on ownership and role.
 */
export function canAccessResource(
  resourceOwnerId: number,
  currentUserId: number,
  session: Session,
  operation: 'read' | 'write'
): boolean {
  // Admin can always access
  if (session.user.role === 'admin') return true;

  // Owner can always access their own data
  if (resourceOwnerId === currentUserId) return true;

  // canViewAll users can read all data but only write their own
  if (operation === 'read' && session.user.canViewAll === true) return true;

  return false;
}