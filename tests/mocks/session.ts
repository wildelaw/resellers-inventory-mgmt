import type { Session } from 'next-auth';
import type { UserRole } from '@/lib/constants';

export function mockSession(overrides?: Partial<{
  id: string; email: string; name: string; role: UserRole;
  canViewAll: boolean; iat: number; passwordChangedAt: number;
}>): Session {
  return {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user' as UserRole,
      canViewAll: false,
      iat: Math.floor(Date.now() / 1000),
      passwordChangedAt: 0,
      ...overrides,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } as unknown as Session;
}

export const adminSession = () => mockSession({ id: '1', role: 'admin', canViewAll: true });
export const userSession = () => mockSession({ id: '2', role: 'user', canViewAll: false });
export const canViewAllSession = () => mockSession({ id: '3', role: 'user', canViewAll: true });
