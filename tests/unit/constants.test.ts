import { describe, it, expect } from 'vitest';
import {
  isValidTransition, getAllowedTransitions, ALLOWED_TRANSITIONS,
  ALL_STATUSES, STATUS_LABELS, ROLE_LABELS, isRemovalStatus,
} from '@/lib/constants';

describe('constants: status transitions', () => {
  it('allows valid transitions from available', () => {
    expect(isValidTransition('available', 'listed')).toBe(true);
    expect(isValidTransition('available', 'sold')).toBe(true);
    expect(isValidTransition('available', 'donated')).toBe(true);
    expect(isValidTransition('available', 'discarded')).toBe(true);
  });

  it('allows valid transitions from listed', () => {
    expect(isValidTransition('listed', 'available')).toBe(true);
    expect(isValidTransition('listed', 'sold')).toBe(true);
  });

  it('allows sold -> returned and returned -> available', () => {
    expect(isValidTransition('sold', 'returned')).toBe(true);
    expect(isValidTransition('returned', 'available')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidTransition('sold', 'available')).toBe(false);
    expect(isValidTransition('available', 'returned')).toBe(false);
    expect(isValidTransition('donated', 'available')).toBe(false);
    expect(isValidTransition('discarded', 'sold')).toBe(false);
  });

  it('treats donated and discarded as terminal', () => {
    expect(ALLOWED_TRANSITIONS.donated).toEqual([]);
    expect(ALLOWED_TRANSITIONS.discarded).toEqual([]);
    expect(getAllowedTransitions('donated')).toEqual([]);
    expect(getAllowedTransitions('discarded')).toEqual([]);
    expect(isRemovalStatus('donated')).toBe(true);
    expect(isRemovalStatus('discarded')).toBe(true);
    expect(isRemovalStatus('sold')).toBe(false);
  });

  it('same-status is a valid (no-op) transition', () => {
    expect(isValidTransition('available', 'available')).toBe(true);
  });
});

describe('constants: labels', () => {
  it('has labels for all statuses', () => {
    for (const s of ALL_STATUSES) expect(typeof STATUS_LABELS[s]).toBe('string');
  });
  it('has labels for admin and user only', () => {
    expect(ROLE_LABELS.admin).toBe('Administrator');
    expect(ROLE_LABELS.user).toBe('Standard User');
    expect(Object.keys(ROLE_LABELS).sort()).toEqual(['admin', 'user']);
  });
});