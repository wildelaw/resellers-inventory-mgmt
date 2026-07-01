import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAllowedTransitions,
  isTerminalStatus,
  ROLE_LABELS,
  STATUS_LABELS,
  ALL_STATUSES,
} from '@/lib/constants';

describe('constants', () => {
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
      expect(isValidTransition('sold', 'available')).toBe(false);
      expect(isValidTransition('available', 'returned')).toBe(false);
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });

    it('rejects same-status transitions', () => {
      expect(isValidTransition('available', 'available')).toBe(false);
      expect(isValidTransition('sold', 'sold')).toBe(false);
    });
  });

  describe('getAllowedTransitions', () => {
    it('returns allowed transitions for available', () => {
      const result = getAllowedTransitions('available');
      expect(result).toEqual(['listed', 'sold', 'donated', 'discarded']);
    });

    it('returns empty array for terminal statuses', () => {
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });
  });

  describe('isTerminalStatus', () => {
    it('returns true for donated and discarded', () => {
      expect(isTerminalStatus('donated')).toBe(true);
      expect(isTerminalStatus('discarded')).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
      expect(isTerminalStatus('available')).toBe(false);
      expect(isTerminalStatus('sold')).toBe(false);
    });
  });

  describe('ROLE_LABELS', () => {
    it('has only admin and user roles', () => {
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