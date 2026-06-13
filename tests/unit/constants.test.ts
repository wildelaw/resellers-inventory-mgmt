import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAllowedTransitions,
  ALL_STATUSES,
  STATUS_LABELS,
  ROLE_LABELS,
  ALLOWED_TRANSITIONS,
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
      expect(isValidTransition('sold', 'listed')).toBe(false);
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'available')).toBe(false);
    });

    it('terminal statuses have no allowed transitions', () => {
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });

    it('rejects transitions from terminal statuses', () => {
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'available')).toBe(false);
      expect(isValidTransition('donated', 'sold')).toBe(false);
    });
  });

  describe('ALL_STATUSES', () => {
    it('contains all six statuses', () => {
      expect(ALL_STATUSES).toHaveLength(6);
      expect(ALL_STATUSES).toContain('available');
      expect(ALL_STATUSES).toContain('listed');
      expect(ALL_STATUSES).toContain('sold');
      expect(ALL_STATUSES).toContain('returned');
      expect(ALL_STATUSES).toContain('donated');
      expect(ALL_STATUSES).toContain('discarded');
    });
  });

  describe('ROLE_LABELS', () => {
    it('only has admin and user roles (no power_user)', () => {
      expect(Object.keys(ROLE_LABELS)).toHaveLength(2);
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('Standard User');
    });
  });

  describe('STATUS_LABELS', () => {
    it('has a label for every status', () => {
      for (const status of ALL_STATUSES) {
        expect(STATUS_LABELS[status]).toBeDefined();
        expect(typeof STATUS_LABELS[status]).toBe('string');
      }
    });
  });
});