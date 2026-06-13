import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedTransitions, ALLOWED_TRANSITIONS } from '@/lib/constants';
import type { ItemStatus } from '@/lib/constants';

describe('Status Transition Workflows', () => {
  describe('Valid transitions', () => {
    it('allows all defined transitions', () => {
      for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
        for (const to of targets) {
          expect(isValidTransition(from as ItemStatus, to as ItemStatus)).toBe(true);
        }
      }
    });
  });

  describe('Invalid transitions', () => {
    const ALL_STATUSES: ItemStatus[] = ['available', 'listed', 'sold', 'returned', 'donated', 'discarded'];

    it('rejects same-to-same transitions', () => {
      for (const status of ALL_STATUSES) {
        expect(isValidTransition(status, status)).toBe(false);
      }
    });

    it('rejects transitions not in allowed list', () => {
      // sold -> available should fail
      expect(isValidTransition('sold', 'available')).toBe(false);
      // available -> returned should fail
      expect(isValidTransition('available', 'returned')).toBe(false);
      // listed -> returned should fail
      expect(isValidTransition('listed', 'returned')).toBe(false);
    });

    it('rejects all transitions from terminal states', () => {
      for (const terminal of ['donated', 'discarded'] as ItemStatus[]) {
        for (const target of ALL_STATUSES) {
          expect(isValidTransition(terminal, target)).toBe(false);
        }
      }
    });
  });

  describe('Side effects', () => {
    it('donated and discarded are terminal (no outgoing transitions)', () => {
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });

    it('sold only allows return', () => {
      expect(getAllowedTransitions('sold')).toEqual(['returned']);
    });

    it('returned only allows back to available', () => {
      expect(getAllowedTransitions('returned')).toEqual(['available']);
    });
  });
});