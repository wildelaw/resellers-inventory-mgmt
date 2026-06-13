import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { UserRole } from './constants';

interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  canViewAll: boolean;
  passwordChangedAt: number;
  iat: number;
}

interface AuthSession {
  user: SessionUser;
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();

  const user = session.user as unknown as SessionUser;

  // Check if session was issued before last password change
  if (user.passwordChangedAt > 0 && (user.iat || 0) < user.passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }

  return { user } as AuthSession;
}

export async function requireAdmin(): Promise<AuthSession> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}

// RBAC helpers
export function canViewAllData(session: AuthSession): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

export function canEditOthersData(session: AuthSession): boolean {
  return session.user.role === 'admin';
}

export function canManageUsers(session: AuthSession): boolean {
  return session.user.role === 'admin';
}

export function canAccessResource(
  resourceOwnerId: number,
  currentUserId: number,
  session: AuthSession,
  operation: 'read' | 'write'
): boolean {
  if (session.user.role === 'admin') return true;
  if (operation === 'read' && session.user.canViewAll) return true;
  return resourceOwnerId === currentUserId;
}