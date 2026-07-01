import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();

  const passwordChangedAt = session.user.passwordChangedAt ?? 0;
  const iat = session.user.iat ?? 0;
  if (passwordChangedAt > 0 && iat < passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

// RBAC helpers
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

export function canAccessResource(
  resourceOwnerId: number | null | undefined,
  currentUserId: string | number,
  session: Session,
  operation: 'read' | 'write',
): boolean {
  if (session.user.role === 'admin') return true;
  if (operation === 'read' && session.user.canViewAll === true) return true;
  const currentId = typeof currentUserId === 'string' ? parseInt(currentUserId, 10) : currentUserId;
  return resourceOwnerId === currentId;
}