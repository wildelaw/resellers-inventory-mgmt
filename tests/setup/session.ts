import type { Session } from 'next-auth';
import type { UserRole } from '@/lib/constants';

export interface MockSessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  canViewAll: boolean;
  iat: number;
  passwordChangedAt?: number;
}

export function mockSession(overrides?: Partial<MockSessionUser>): Session {
  const user: MockSessionUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    canViewAll: false,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
  return {
    user: user as unknown as Session['user'],
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  } as Session;
}