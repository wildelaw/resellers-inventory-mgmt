import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAllowedTransitions,
  ALL_STATUSES,
  ROLE_LABELS,
  STATUS_LABELS,
  type ItemStatus,
  type UserRole,
} from '@/lib/constants';

describe('Constants', () => {
  describe('isValidTransition', () => {
    it('allows valid transitions from available', () => {
      expect(isValidTransition('available', 'listed')).toBe(true);
      expect(isValidTransition('available', 'sold')).toBe(true);
      expect(isValidTransition('available', 'donated')).toBe(true);
      expect(isValidTransition('available', 'discarded')).toBe(true);
    });

    it('allows valid transitions from listed', () => {
      expect(isValidTransition('listed', 'available')).toBe(true);
      expect(isValidTransition('listed', 'sold')).toBe(true);
      expect(isValidTransition('listed', 'donated')).toBe(true);
      expect(isValidTransition('listed', 'discarded')).toBe(true);
    });

    it('allows valid transitions from sold', () => {
      expect(isValidTransition('sold', 'returned')).toBe(true);
    });

    it('allows valid transitions from returned', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(isValidTransition('available', 'available')).toBe(false);
      expect(isValidTransition('sold', 'available')).toBe(false);
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });

    it('rejects transitions from terminal states', () => {
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('donated', 'sold')).toBe(false);
      expect(isValidTransition('discarded', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns correct transitions for available', () => {
      const transitions = getAllowedTransitions('available');
      expect(transitions).toEqual(['listed', 'sold', 'donated', 'discarded']);
    });

    it('returns empty array for terminal states', () => {
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });
  });

  describe('ALL_STATUSES', () => {
    it('contains all expected statuses', () => {
      expect(ALL_STATUSES).toEqual(['available', 'listed', 'sold', 'returned', 'donated', 'discarded']);
    });
  });

  describe('ROLE_LABELS', () => {
    it('contains only admin and user roles', () => {
      expect(Object.keys(ROLE_LABELS)).toEqual(['admin', 'user']);
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('Standard User');
    });
  });

  describe('STATUS_LABELS', () => {
    it('has labels for all statuses', () => {
      for (const status of ALL_STATUSES) {
        expect(STATUS_LABELS[status]).toBeDefined();
      }
    });
  });
});