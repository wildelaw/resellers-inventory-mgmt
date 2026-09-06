import { describe, it, expect, vi } from 'vitest';
import {
  canViewAllData,
  canEditOthersData,
  canManageUsers,
  canAccessResource,
  sessionUserId,
} from '@/lib/auth-utils';
import { mockSession } from '../setup/session';

// auth-utils imports './auth' (NextAuth) — mock it so the module loads
// without a configured secret.
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));

describe('canViewAllData', () => {
  it('true for admin', () => {
    expect(canViewAllData(mockSession({ role: 'admin', canViewAll: false }))).toBe(true);
  });
  it('true for user with canViewAll', () => {
    expect(canViewAllData(mockSession({ role: 'user', canViewAll: true }))).toBe(true);
  });
  it('false for standard user', () => {
    expect(canViewAllData(mockSession({ role: 'user', canViewAll: false }))).toBe(false);
  });
});

describe('canEditOthersData', () => {
  it('true for admin only', () => {
    expect(canEditOthersData(mockSession({ role: 'admin' }))).toBe(true);
    expect(canEditOthersData(mockSession({ role: 'user', canViewAll: true }))).toBe(false);
    expect(canEditOthersData(mockSession({ role: 'user', canViewAll: false }))).toBe(false);
  });
});

describe('canManageUsers', () => {
  it('true for admin only', () => {
    expect(canManageUsers(mockSession({ role: 'admin' }))).toBe(true);
    expect(canManageUsers(mockSession({ role: 'user', canViewAll: true }))).toBe(false);
    expect(canManageUsers(mockSession({ role: 'user' }))).toBe(false);
  });
});

describe('canAccessResource', () => {
  const OWNER = 1, OTHER = 2;

  it('admin can access anything, read or write', () => {
    const s = mockSession({ id: OWNER, role: 'admin' });
    expect(canAccessResource(OTHER, OWNER, s, 'read')).toBe(true);
    expect(canAccessResource(OTHER, OWNER, s, 'write')).toBe(true);
  });

  it('standard user: own resources only', () => {
    const s = mockSession({ id: OWNER, role: 'user', canViewAll: false });
    expect(canAccessResource(OWNER, OWNER, s, 'read')).toBe(true);
    expect(canAccessResource(OWNER, OWNER, s, 'write')).toBe(true);
    expect(canAccessResource(OTHER, OWNER, s, 'read')).toBe(false);
    expect(canAccessResource(OTHER, OWNER, s, 'write')).toBe(false);
  });

  it('canViewAll user: read everything, write only own', () => {
    const s = mockSession({ id: OWNER, role: 'user', canViewAll: true });
    expect(canAccessResource(OTHER, OWNER, s, 'read')).toBe(true);
    expect(canAccessResource(OTHER, OWNER, s, 'write')).toBe(false);
    expect(canAccessResource(OWNER, OWNER, s, 'write')).toBe(true);
  });
});

describe('sessionUserId', () => {
  it('coerces the session id to a number', () => {
    expect(sessionUserId(mockSession({ id: 7 }))).toBe(7);
  });
});