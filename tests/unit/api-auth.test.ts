import { describe, it, expect } from 'vitest';
import { canViewAllData, canEditOthersData, canManageUsers, canAccessResource } from '@/lib/auth-utils';
import { mockSession, adminSession, userSession, canViewAllSession } from '../mocks/session';

describe('RBAC helpers', () => {
  describe('canViewAllData', () => {
    it('returns true for admin', () => { expect(canViewAllData(adminSession())).toBe(true); });
    it('returns true for user with canViewAll', () => { expect(canViewAllData(canViewAllSession())).toBe(true); });
    it('returns false for standard user', () => { expect(canViewAllData(userSession())).toBe(false); });
  });

  describe('canEditOthersData', () => {
    it('returns true for admin', () => { expect(canEditOthersData(adminSession())).toBe(true); });
    it('returns false for user with canViewAll', () => { expect(canEditOthersData(canViewAllSession())).toBe(false); });
    it('returns false for standard user', () => { expect(canEditOthersData(userSession())).toBe(false); });
  });

  describe('canManageUsers', () => {
    it('returns true for admin', () => { expect(canManageUsers(adminSession())).toBe(true); });
    it('returns false for user', () => { expect(canManageUsers(userSession())).toBe(false); });
    it('returns false for canViewAll user', () => { expect(canManageUsers(canViewAllSession())).toBe(false); });
  });

  describe('canAccessResource', () => {
    it('admin can read any resource', () => { expect(canAccessResource(999, adminSession(), 'read')).toBe(true); });
    it('admin can write any resource', () => { expect(canAccessResource(999, adminSession(), 'write')).toBe(true); });
    it('user can read own resource', () => {
      const s = mockSession({ id: '5' });
      expect(canAccessResource(5, s, 'read')).toBe(true);
    });
    it('user can write own resource', () => {
      const s = mockSession({ id: '5' });
      expect(canAccessResource(5, s, 'write')).toBe(true);
    });
    it('user cannot read others resource', () => {
      const s = mockSession({ id: '5' });
      expect(canAccessResource(999, s, 'read')).toBe(false);
    });
    it('canViewAll user can read others resource', () => {
      const s = canViewAllSession();
      expect(canAccessResource(999, s, 'read')).toBe(true);
    });
    it('canViewAll user cannot write others resource', () => {
      const s = canViewAllSession();
      expect(canAccessResource(999, s, 'write')).toBe(false);
    });
  });
});
