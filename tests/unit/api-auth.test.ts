import { describe, it, expect } from 'vitest';
import { canViewAllData, canEditOthersData, canManageUsers } from '@/lib/auth-utils';

// Mock session objects for testing RBAC helpers
function createSession(role: 'admin' | 'user', canViewAll: boolean = false) {
  return {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role,
      canViewAll,
      passwordChangedAt: 0,
      iat: Math.floor(Date.now() / 1000),
    },
    expires: new Date().toISOString(),
  } as any;
}

describe('Auth Utils RBAC Helpers', () => {
  describe('canViewAllData', () => {
    it('returns true for admin', () => {
      const session = createSession('admin');
      expect(canViewAllData(session)).toBe(true);
    });

    it('returns true for user with canViewAll=true', () => {
      const session = createSession('user', true);
      expect(canViewAllData(session)).toBe(true);
    });

    it('returns false for user with canViewAll=false', () => {
      const session = createSession('user', false);
      expect(canViewAllData(session)).toBe(false);
    });
  });

  describe('canEditOthersData', () => {
    it('returns true for admin', () => {
      const session = createSession('admin');
      expect(canEditOthersData(session)).toBe(true);
    });

    it('returns false for user even with canViewAll=true', () => {
      const session = createSession('user', true);
      expect(canEditOthersData(session)).toBe(false);
    });

    it('returns false for regular user', () => {
      const session = createSession('user', false);
      expect(canEditOthersData(session)).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('returns true for admin', () => {
      const session = createSession('admin');
      expect(canManageUsers(session)).toBe(true);
    });

    it('returns false for user', () => {
      const session = createSession('user');
      expect(canManageUsers(session)).toBe(false);
    });

    it('returns false for user with canViewAll', () => {
      const session = createSession('user', true);
      expect(canManageUsers(session)).toBe(false);
    });
  });
});