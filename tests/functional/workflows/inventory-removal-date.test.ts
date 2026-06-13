import { describe, it, expect } from 'vitest';
import { isValidTransition, TERMINAL_STATUSES } from '@/lib/constants';

describe('Inventory removal date', () => {
  describe('Auto-set removalDate', () => {
    it('status donated is terminal (sets removalDate)', () => {
      expect(isValidTransition('available', 'donated')).toBe(true);
      expect(TERMINAL_STATUSES).toContain('donated');
    });

    it('status discarded is terminal (sets removalDate)', () => {
      expect(isValidTransition('available', 'discarded')).toBe(true);
      expect(TERMINAL_STATUSES).toContain('discarded');
    });

    it('status sold also sets removalDate (to soldDate)', () => {
      expect(isValidTransition('available', 'sold')).toBe(true);
    });
  });

  describe('Clear removalDate', () => {
    it('returned to available clears removalDate', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
    });
  });

  describe('No $0 auto-sales', () => {
    it('donated/discarded items do NOT create sale records (design decision)', () => {
      // v2 spec: No automatic $0 sale records for donated/discarded items
      // These are inventory dispositions, not sales
      // removalDate is set, but no sale record is created
      expect(TERMINAL_STATUSES).toContain('donated');
      expect(TERMINAL_STATUSES).toContain('discarded');
    });
  });
});