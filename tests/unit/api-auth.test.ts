import { describe, it, expect } from 'vitest';
import { canViewAllData, canEditOthersData, canManageUsers } from '@/lib/auth-utils';
import type { Session } from 'next-auth';

function mockSession(role: 'admin' | 'user', canViewAll = false): Session {
  return {
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      role,
      canViewAll,
      iat: Math.floor(Date.now() / 1000),
      passwordChangedAt: 0,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  } as Session;
}

describe('RBAC helpers', () => {
  describe('canViewAllData', () => {
    it('returns true for admin', () => {
      expect(canViewAllData(mockSession('admin'))).toBe(true);
    });

    it('returns true for user with canViewAll', () => {
      expect(canViewAllData(mockSession('user', true))).toBe(true);
    });

    it('returns false for user without canViewAll', () => {
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

    it('returns false for user without canViewAll', () => {
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

    it('returns false for user without canViewAll', () => {
      expect(canManageUsers(mockSession('user', false))).toBe(false);
    });
  });
});