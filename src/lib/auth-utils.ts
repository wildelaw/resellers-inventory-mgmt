import { auth } from './auth';
import { ApiErrors } from './api-errors';
import type { Session } from 'next-auth';

/**
 * Require authentication for a server-side operation
 * Throws ApiErrors.Unauthorized if not authenticated or session invalidated
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth();
  
  if (!session?.user) {
    throw ApiErrors.Unauthorized();
  }
  
  // Check session invalidation via passwordChangedAt
  const passwordChangedAt = (session.user as any).passwordChangedAt || 0;
  const iat = (session.user as any).iat || 0;
  
  if (passwordChangedAt > 0 && iat < passwordChangedAt) {
    throw ApiErrors.Unauthorized('Session invalidated');
  }
  
  return session;
}

/**
 * Require admin role for a server-side operation
 * Throws ApiErrors.Unauthorized if not authenticated
 * Throws ApiErrors.Forbidden if not admin
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin') {
    throw ApiErrors.Forbidden();
  }
  
  return session;
}

/**
 * Check if the user can view all data across users
 * Returns true for admin or users with canViewAll flag
 */
export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

/**
 * Check if the user can edit data belonging to other users
 * Returns true only for admin
 */
export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if the user can manage other users (create, edit, delete)
 * Returns true only for admin
 */
export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

/**
 * Check if the user can access a specific resource
 * 
 * @param resourceOwnerId - The ID of the user who owns the resource
 * @param currentUserId - The ID of the current user
 * @param session - The current session
 * @param operation - The operation being performed ('read' or 'write')
 * @returns true if the user can access the resource
 */
export function canAccessResource(
  resourceOwnerId: number,
  currentUserId: string,
  session: Session,
  operation: 'read' | 'write'
): boolean {
  // Admin can do everything
  if (session.user.role === 'admin') {
    return true;
  }
  
  // User owns the resource
  if (resourceOwnerId === parseInt(currentUserId)) {
    return true;
  }
  
  // For read operations, check canViewAll
  if (operation === 'read' && session.user.canViewAll) {
    return true;
  }
  
  // For write operations, only owner or admin can modify
  return false;
}

/**
 * Check if the user can perform an operation on a resource
 * Throws ApiErrors.Forbidden if not allowed
 */
export function requireResourceAccess(
  resourceOwnerId: number,
  currentUserId: string,
  session: Session,
  operation: 'read' | 'write'
): void {
  if (!canAccessResource(resourceOwnerId, currentUserId, session, operation)) {
    throw ApiErrors.Forbidden();
  }
}
