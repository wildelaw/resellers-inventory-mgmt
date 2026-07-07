import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAllowedTransitions,
  ALLOWED_TRANSITIONS,
  ROLE_LABELS,
  STATUS_LABELS,
  isTerminalStatus,
} from '../../src/lib/constants';

describe('Constants', () => {
  describe('Status Transitions', () => {
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

    it('allows sold to returned only', () => {
      expect(isValidTransition('sold', 'returned')).toBe(true);
      expect(isValidTransition('sold', 'available')).toBe(false);
      expect(isValidTransition('sold', 'listed')).toBe(false);
    });

    it('allows returned to available only', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
      expect(isValidTransition('returned', 'sold')).toBe(false);
    });

    it('rejects transitions from terminal statuses', () => {
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('donated', 'sold')).toBe(false);
      expect(isValidTransition('discarded', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });

    it('rejects same-status transitions', () => {
      expect(isValidTransition('available', 'available')).toBe(false);
      expect(isValidTransition('sold', 'sold')).toBe(false);
    });

    it('returns correct allowed transitions', () => {
      expect(getAllowedTransitions('available')).toEqual(['listed', 'sold', 'donated', 'discarded']);
      expect(getAllowedTransitions('sold')).toEqual(['returned']);
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });
  });

  describe('Terminal Statuses', () => {
    it('identifies terminal statuses', () => {
      expect(isTerminalStatus('donated')).toBe(true);
      expect(isTerminalStatus('discarded')).toBe(true);
    });

    it('identifies non-terminal statuses', () => {
      expect(isTerminalStatus('available')).toBe(false);
      expect(isTerminalStatus('listed')).toBe(false);
      expect(isTerminalStatus('sold')).toBe(false);
      expect(isTerminalStatus('returned')).toBe(false);
    });
  });

  describe('Role Labels', () => {
    it('has labels for admin and user only', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('Standard User');
      expect(Object.keys(ROLE_LABELS)).toHaveLength(2);
    });
  });

  describe('Status Labels', () => {
    it('has labels for all statuses', () => {
      expect(STATUS_LABELS.available).toBe('Available');
      expect(STATUS_LABELS.sold).toBe('Sold');
      expect(STATUS_LABELS.donated).toBe('Donated');
      expect(STATUS_LABELS.discarded).toBe('Discarded');
    });
  });
});