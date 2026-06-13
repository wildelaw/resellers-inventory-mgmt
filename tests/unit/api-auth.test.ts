import { describe, it, expect } from 'vitest';

// Mock session types for testing RBAC helpers
interface MockSession {
  user: {
    id: number;
    role: 'admin' | 'user';
    canViewAll: boolean;
    passwordChangedAt: number;
    iat: number;
  };
}

// Inline the RBAC logic for testing (same as auth-utils.ts)
function canViewAllData(session: MockSession): boolean {
  return session.user.role === 'admin' || session.user.canViewAll === true;
}

function canEditOthersData(session: MockSession): boolean {
  return session.user.role === 'admin';
}

function canManageUsers(session: MockSession): boolean {
  return session.user.role === 'admin';
}

describe('Auth Utils - RBAC Helpers', () => {
  const adminSession: MockSession = { user: { id: 1, role: 'admin', canViewAll: true, passwordChangedAt: 0, iat: 1000 } };
  const canViewAllSession: MockSession = { user: { id: 2, role: 'user', canViewAll: true, passwordChangedAt: 0, iat: 1000 } };
  const standardSession: MockSession = { user: { id: 3, role: 'user', canViewAll: false, passwordChangedAt: 0, iat: 1000 } };

  describe('canViewAllData', () => {
    it('returns true for admin', () => {
      expect(canViewAllData(adminSession)).toBe(true);
    });

    it('returns true for user with canViewAll=true', () => {
      expect(canViewAllData(canViewAllSession)).toBe(true);
    });

    it('returns false for standard user', () => {
      expect(canViewAllData(standardSession)).toBe(false);
    });
  });

  describe('canEditOthersData', () => {
    it('returns true for admin', () => {
      expect(canEditOthersData(adminSession)).toBe(true);
    });

    it('returns false for canViewAll user', () => {
      expect(canEditOthersData(canViewAllSession)).toBe(false);
    });

    it('returns false for standard user', () => {
      expect(canEditOthersData(standardSession)).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('returns true for admin', () => {
      expect(canManageUsers(adminSession)).toBe(true);
    });

    it('returns false for canViewAll user', () => {
      expect(canManageUsers(canViewAllSession)).toBe(false);
    });

    it('returns false for standard user', () => {
      expect(canManageUsers(standardSession)).toBe(false);
    });
  });
});