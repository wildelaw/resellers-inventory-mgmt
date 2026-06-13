import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedTransitions, ROLE_LABELS, ALL_STATUSES, STATUS_LABELS, TERMINAL_STATUSES, DEFAULT_SALES_TAX_RATE } from '@/lib/constants';

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

    it('allows sold to returned', () => {
      expect(isValidTransition('sold', 'returned')).toBe(true);
    });

    it('allows returned to available', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(isValidTransition('available', 'available')).toBe(false);
      expect(isValidTransition('sold', 'available')).toBe(false);
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'available')).toBe(false);
      expect(isValidTransition('available', 'returned')).toBe(false);
    });

    it('terminal statuses have no valid transitions', () => {
      TERMINAL_STATUSES.forEach(status => {
        expect(isValidTransition(status, 'available')).toBe(false);
        expect(isValidTransition(status, 'sold')).toBe(false);
      });
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns correct transitions for available', () => {
      expect(getAllowedTransitions('available')).toEqual(['listed', 'sold', 'donated', 'discarded']);
    });

    it('returns empty array for terminal statuses', () => {
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });
  });

  describe('Role labels', () => {
    it('has admin and user labels', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('Standard User');
      expect(Object.keys(ROLE_LABELS)).toHaveLength(2);
    });
  });

  describe('Status labels', () => {
    it('has all 6 statuses', () => {
      expect(ALL_STATUSES).toHaveLength(6);
      ALL_STATUSES.forEach(status => {
        expect(STATUS_LABELS[status]).toBeDefined();
      });
    });
  });

  describe('Default sales tax rate', () => {
    it('is 8.25%', () => {
      expect(DEFAULT_SALES_TAX_RATE).toBe(0.0825);
    });
  });
});