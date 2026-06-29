import { describe, it, expect } from 'vitest';
import { canViewAllData, canEditOthersData, canManageUsers, canAccessResource, currentUserId } from '@/lib/auth-utils';
import { makeSession } from '../helpers/auth-mock';

describe('RBAC helpers', () => {
  it('admin can view all, edit others, manage users', () => {
    const s = makeSession({ role: 'admin', canViewAll: true });
    expect(canViewAllData(s)).toBe(true);
    expect(canEditOthersData(s)).toBe(true);
    expect(canManageUsers(s)).toBe(true);
  });

  it('user+canViewAll can view all but not edit others or manage users', () => {
    const s = makeSession({ id: '2', role: 'user', canViewAll: true });
    expect(canViewAllData(s)).toBe(true);
    expect(canEditOthersData(s)).toBe(false);
    expect(canManageUsers(s)).toBe(false);
  });

  it('default user cannot view all, edit others, or manage users', () => {
    const s = makeSession({ id: '3', role: 'user', canViewAll: false });
    expect(canViewAllData(s)).toBe(false);
    expect(canEditOthersData(s)).toBe(false);
    expect(canManageUsers(s)).toBe(false);
  });

  it('canAccessResource: admin always true', () => {
    const s = makeSession({ id: '1', role: 'admin' });
    expect(canAccessResource(999, 1, s, 'read')).toBe(true);
    expect(canAccessResource(999, 1, s, 'write')).toBe(true);
  });

  it('canAccessResource: canViewAll user can read others but not write', () => {
    const s = makeSession({ id: '2', role: 'user', canViewAll: true });
    expect(canAccessResource(999, 2, s, 'read')).toBe(true);
    expect(canAccessResource(999, 2, s, 'write')).toBe(false);
    expect(canAccessResource(2, 2, s, 'write')).toBe(true); // own data
  });

  it('canAccessResource: default user only own data', () => {
    const s = makeSession({ id: '3', role: 'user', canViewAll: false });
    expect(canAccessResource(3, 3, s, 'read')).toBe(true);
    expect(canAccessResource(999, 3, s, 'read')).toBe(false);
    expect(canAccessResource(999, 3, s, 'write')).toBe(false);
  });

  it('currentUserId parses numeric id', () => {
    expect(currentUserId(makeSession({ id: '42' }))).toBe(42);
    expect(currentUserId(makeSession({ id: 'bad' }))).toBe(0);
  });
});