import type { Session } from 'next-auth';

// Pure RBAC helpers — no auth() dependency, safe to import in unit tests.

export function canViewAllData(session: Session): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

export function canEditOthersData(session: Session): boolean {
  return session.user.role === 'admin';
}

export function canManageUsers(session: Session): boolean {
  return session.user.role === 'admin';
}

export type ResourceOperation = 'read' | 'write';

export function canAccessResource(
  resourceOwnerId: number | string | null | undefined,
  currentUserId: string | number,
  session: Session,
  operation: ResourceOperation,
): boolean {
  if (session.user.role === 'admin') return true;
  const ownId = String(currentUserId);
  const ownerId = resourceOwnerId === null || resourceOwnerId === undefined
    ? null
    : String(resourceOwnerId);
  if (operation === 'read') {
    if (session.user.canViewAll === true) return true;
    return ownerId === ownId;
  }
  return ownerId === ownId;
}

export function currentUserId(session: Session): number {
  return Number(session.user.id);
}