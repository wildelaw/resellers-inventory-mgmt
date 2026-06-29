import { describe, it, expect } from 'vitest';
import { canViewAllData, canEditOthersData, canManageUsers, canAccessResource } from '@/lib/rbac';
import type { Session } from 'next-auth';

function makeSession(overrides: Partial<Session['user']> = {}): Session {
  return {
    user: {
      id: '1',
      name: 'Test',
      email: 'test@test.com',
      role: 'user',
      canViewAll: false,
      iat: Math.floor(Date.now() / 1000),
      passwordChangedAt: 0,
      ...overrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

describe('RBAC helpers', () => {
  describe('canViewAllData', () => {
    it('returns true for admin', () => {
      expect(canViewAllData(makeSession({ role: 'admin' }))).toBe(true);
    });
    it('returns true for user with canViewAll=true', () => {
      expect(canViewAllData(makeSession({ role: 'user', canViewAll: true }))).toBe(true);
    });
    it('returns false for default user', () => {
      expect(canViewAllData(makeSession({ role: 'user', canViewAll: false }))).toBe(false);
    });
  });

  describe('canEditOthersData', () => {
    it('returns true only for admin', () => {
      expect(canEditOthersData(makeSession({ role: 'admin' }))).toBe(true);
      expect(canEditOthersData(makeSession({ role: 'user', canViewAll: true }))).toBe(false);
      expect(canEditOthersData(makeSession({ role: 'user', canViewAll: false }))).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('returns true only for admin', () => {
      expect(canManageUsers(makeSession({ role: 'admin' }))).toBe(true);
      expect(canManageUsers(makeSession({ role: 'user' }))).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('admin always returns true', () => {
      const s = makeSession({ role: 'admin', id: '1' });
      expect(canAccessResource(99, s.user.id, s, 'read')).toBe(true);
      expect(canAccessResource(99, s.user.id, s, 'write')).toBe(true);
    });

    it('canViewAll user can read any, write only own', () => {
      const s = makeSession({ role: 'user', id: '1', canViewAll: true });
      expect(canAccessResource(99, s.user.id, s, 'read')).toBe(true);
      expect(canAccessResource(99, s.user.id, s, 'write')).toBe(false);
      expect(canAccessResource(1, s.user.id, s, 'write')).toBe(true);
    });

    it('default user can only access own data', () => {
      const s = makeSession({ role: 'user', id: '1', canViewAll: false });
      expect(canAccessResource(1, s.user.id, s, 'read')).toBe(true);
      expect(canAccessResource(99, s.user.id, s, 'read')).toBe(false);
      expect(canAccessResource(99, s.user.id, s, 'write')).toBe(false);
    });

    it('handles null resource ownerId', () => {
      const s = makeSession({ role: 'user', id: '1' });
      expect(canAccessResource(null, s.user.id, s, 'read')).toBe(false);
    });
  });
});