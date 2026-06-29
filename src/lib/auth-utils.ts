import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

// Re-export pure RBAC helpers from rbac.ts (kept separate for unit testing).
export {
  canViewAllData,
  canEditOthersData,
  canManageUsers,
  canAccessResource,
  currentUserId,
  type ResourceOperation,
} from './rbac';

export async function requireAuth(): Promise<Session> {
  const session = await auth();
  if (!session?.user) throw ApiErrors.Unauthorized();
  const pca = session.user.passwordChangedAt ?? 0;
  const iat = session.user.iat ?? 0;
  if (pca > 0 && iat < pca) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (session.user.role !== 'admin') throw ApiErrors.Forbidden();
  return session;
}