import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAllowedTransitions,
  ALLOWED_TRANSITIONS,
  ROLE_LABELS,
  STATUS_LABELS,
  ALL_STATUSES,
  isRemovedStatus,
  removalDateForTransition,
  type ItemStatus,
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
    });

    it('allows sold → returned', () => {
      expect(isValidTransition('sold', 'returned')).toBe(true);
    });

    it('allows returned → available', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(isValidTransition('sold', 'available')).toBe(false);
      expect(isValidTransition('available', 'returned')).toBe(false);
      expect(isValidTransition('donated', 'available')).toBe(false);
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });

    it('treats same status as no-op (allowed)', () => {
      expect(isValidTransition('available', 'available')).toBe(true);
      expect(isValidTransition('sold', 'sold')).toBe(true);
    });

    it('treats terminal statuses as having no outgoing transitions', () => {
      expect(getAllowedTransitions('donated')).toEqual([]);
      expect(getAllowedTransitions('discarded')).toEqual([]);
    });
  });

  describe('removalDateForTransition', () => {
    it('sets removalDate for sold/donated/discarded', () => {
      const now = 1_000_000;
      expect(removalDateForTransition('sold', 'available', now)).toBe(now);
      expect(removalDateForTransition('donated', 'available', now)).toBe(now);
      expect(removalDateForTransition('discarded', 'listed', now)).toBe(now);
    });

    it('clears removalDate when returned → available', () => {
      expect(removalDateForTransition('available', 'returned')).toBeNull();
    });

    it('returns undefined for no-change transitions', () => {
      // listed is not a removal target and not a "clear" transition
      expect(removalDateForTransition('listed', 'available')).toBeUndefined();
      // available → returned is not a removal or clear transition
      expect(removalDateForTransition('returned', 'sold')).toBeUndefined();
    });
  });

  describe('isRemovedStatus', () => {
    it('returns true for sold, donated, discarded', () => {
      expect(isRemovedStatus('sold')).toBe(true);
      expect(isRemovedStatus('donated')).toBe(true);
      expect(isRemovedStatus('discarded')).toBe(true);
    });
    it('returns false for available, listed, returned', () => {
      expect(isRemovedStatus('available')).toBe(false);
      expect(isRemovedStatus('listed')).toBe(false);
      expect(isRemovedStatus('returned')).toBe(false);
    });
  });

  describe('labels', () => {
    it('has labels for all statuses', () => {
      ALL_STATUSES.forEach((s) => {
        expect(STATUS_LABELS[s]).toBeTruthy();
      });
    });

    it('has labels for admin and user roles only', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('Standard User');
      expect(Object.keys(ROLE_LABELS).sort()).toEqual(['admin', 'user']);
    });
  });

  describe('ALLOWED_TRANSITIONS shape', () => {
    it('defines transitions for every status', () => {
      const statuses: ItemStatus[] = ['available', 'listed', 'sold', 'returned', 'donated', 'discarded'];
      statuses.forEach((s) => {
        expect(Array.isArray(ALLOWED_TRANSITIONS[s])).toBe(true);
      });
    });
  });
});