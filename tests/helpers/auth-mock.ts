/**
 * Mutable session store used by integration tests to control what `auth()`
 * returns, without going through a real NextAuth JWT round-trip.
 */
import { vi } from 'vitest';
import type { Session } from 'next-auth';
import type { UserRole } from '@/lib/constants';

interface MockSessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  canViewAll: boolean;
  passwordChangedAt: number;
  isActive: boolean;
  iat: number;
}

const store = vi.hoisted(() => ({ current: null as Session | null }));

export function setSession(session: Session | null): void {
  store.current = session;
}

export function clearSession(): void {
  store.current = null;
}

export function currentSession(): Session | null {
  return store.current;
}

export function makeSession(overrides: Partial<MockSessionUser> = {}): Session {
  const user: MockSessionUser = {
    id: overrides.id ?? '1',
    email: overrides.email ?? 'admin@example.com',
    name: overrides.name ?? 'Admin',
    role: overrides.role ?? 'admin',
    canViewAll: overrides.canViewAll ?? true,
    passwordChangedAt: overrides.passwordChangedAt ?? 0,
    isActive: overrides.isActive ?? true,
    iat: overrides.iat ?? Math.floor(Date.now() / 1000),
  };
  return {
    user,
    expires: new Date(Date.now() + 30 * 86400000).toISOString(),
  } as unknown as Session;
}