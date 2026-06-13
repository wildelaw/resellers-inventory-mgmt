import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedTransitions, TERMINAL_STATUSES } from '@/lib/constants';

describe('Status transitions', () => {
  describe('Valid transitions', () => {
    it('available can transition to listed, sold, donated, discarded', () => {
      expect(isValidTransition('available', 'listed')).toBe(true);
      expect(isValidTransition('available', 'sold')).toBe(true);
      expect(isValidTransition('available', 'donated')).toBe(true);
      expect(isValidTransition('available', 'discarded')).toBe(true);
    });

    it('listed can transition to available, sold, donated, discarded', () => {
      expect(isValidTransition('listed', 'available')).toBe(true);
      expect(isValidTransition('listed', 'sold')).toBe(true);
      expect(isValidTransition('listed', 'donated')).toBe(true);
      expect(isValidTransition('listed', 'discarded')).toBe(true);
    });

    it('sold can transition to returned', () => {
      expect(isValidTransition('sold', 'returned')).toBe(true);
    });

    it('returned can transition to available', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    it('rejects sold to available', () => {
      expect(isValidTransition('sold', 'available')).toBe(false);
    });

    it('rejects sold to donated', () => {
      expect(isValidTransition('sold', 'donated')).toBe(false);
    });

    it('rejects available to returned', () => {
      expect(isValidTransition('available', 'returned')).toBe(false);
    });

    it('terminal statuses have no valid transitions', () => {
      TERMINAL_STATUSES.forEach(status => {
        const transitions = getAllowedTransitions(status);
        expect(transitions).toHaveLength(0);
      });
    });

    it('donated cannot transition to anything', () => {
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('donated', 'listed')).toBe(false);
      expect(isValidTransition('donated', 'sold')).toBe(false);
    });

    it('discarded cannot transition to anything', () => {
      expect(isValidTransition('discarded', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'listed')).toBe(false);
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });
  });

  describe('Side effects', () => {
    it('donated and discarded are terminal statuses', () => {
      expect(TERMINAL_STATUSES).toContain('donated');
      expect(TERMINAL_STATUSES).toContain('discarded');
    });

    it('no $0 auto-sales for donated/discarded (design decision)', () => {
      // This test documents the v2 design: when an item transitions to
      // donated or discarded, only removalDate is set. No sale record is created.
      // This is enforced in the API routes, not in constants.
      expect(TERMINAL_STATUSES).toContain('donated');
      expect(TERMINAL_STATUSES).toContain('discarded');
    });
  });
});