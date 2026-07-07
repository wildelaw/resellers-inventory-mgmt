import { describe, it, expect } from 'vitest';
import { canViewAllData, canEditOthersData, canManageUsers, canAccessResource } from '../../src/lib/auth-utils';

function mockSession(role: 'admin' | 'user' = 'user', canViewAll = false, userId = 1) {
  return {
    user: {
      id: String(userId),
      role,
      canViewAll,
      iat: Math.floor(Date.now() / 1000),
      passwordChangedAt: 0,
      name: 'Test User',
      email: 'test@example.com',
    },
  } as any;
}

describe('Auth Utils - RBAC', () => {
  describe('canViewAllData', () => {
    it('returns true for admin', () => {
      expect(canViewAllData(mockSession('admin'))).toBe(true);
    });

    it('returns true for user with canViewAll', () => {
      expect(canViewAllData(mockSession('user', true))).toBe(true);
    });

    it('returns false for default user', () => {
      expect(canViewAllData(mockSession('user', false))).toBe(false);
    });
  });

  describe('canEditOthersData', () => {
    it('returns true for admin', () => {
      expect(canEditOthersData(mockSession('admin'))).toBe(true);
    });

    it('returns false for user with canViewAll', () => {
      expect(canEditOthersData(mockSession('user', true))).toBe(false);
    });

    it('returns false for default user', () => {
      expect(canEditOthersData(mockSession('user', false))).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('returns true for admin', () => {
      expect(canManageUsers(mockSession('admin'))).toBe(true);
    });

    it('returns false for user with canViewAll', () => {
      expect(canManageUsers(mockSession('user', true))).toBe(false);
    });

    it('returns false for default user', () => {
      expect(canManageUsers(mockSession('user', false))).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('admin can always access', () => {
      expect(canAccessResource(99, mockSession('admin', false, 1), 'read')).toBe(true);
      expect(canAccessResource(99, mockSession('admin', false, 1), 'write')).toBe(true);
    });

    it('user can access own data for read and write', () => {
      const session = mockSession('user', false, 1);
      expect(canAccessResource(1, session, 'read')).toBe(true);
      expect(canAccessResource(1, session, 'write')).toBe(true);
    });

    it('user cannot access others data for read or write', () => {
      const session = mockSession('user', false, 1);
      expect(canAccessResource(99, session, 'read')).toBe(false);
      expect(canAccessResource(99, session, 'write')).toBe(false);
    });

    it('canViewAll user can read others data but not write', () => {
      const session = mockSession('user', true, 1);
      expect(canAccessResource(99, session, 'read')).toBe(true);
      expect(canAccessResource(99, session, 'write')).toBe(false);
    });

    it('canViewAll user can write own data', () => {
      const session = mockSession('user', true, 1);
      expect(canAccessResource(1, session, 'write')).toBe(true);
    });
  });
});