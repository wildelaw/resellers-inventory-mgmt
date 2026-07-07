import { describe, it, expect } from 'vitest';
import { isValidTransition, getAllowedTransitions, ALLOWED_TRANSITIONS, ALL_STATUSES, STATUS_LABELS, ROLE_LABELS } from '@/lib/constants';

describe('constants', () => {
  describe('isValidTransition', () => {
    it('allows available → listed', () => { expect(isValidTransition('available', 'listed')).toBe(true); });
    it('allows available → sold', () => { expect(isValidTransition('available', 'sold')).toBe(true); });
    it('allows available → donated', () => { expect(isValidTransition('available', 'donated')).toBe(true); });
    it('allows available → discarded', () => { expect(isValidTransition('available', 'discarded')).toBe(true); });
    it('allows listed → available', () => { expect(isValidTransition('listed', 'available')).toBe(true); });
    it('allows listed → sold', () => { expect(isValidTransition('listed', 'sold')).toBe(true); });
    it('allows sold → returned', () => { expect(isValidTransition('sold', 'returned')).toBe(true); });
    it('allows returned → available', () => { expect(isValidTransition('returned', 'available')).toBe(true); });
    it('rejects sold → available (direct)', () => { expect(isValidTransition('sold', 'available')).toBe(false); });
    it('rejects donated → anything (terminal)', () => {
      ALL_STATUSES.forEach((s) => { if (s !== 'donated') expect(isValidTransition('donated', s)).toBe(false); });
    });
    it('rejects discarded → anything (terminal)', () => {
      ALL_STATUSES.forEach((s) => { if (s !== 'discarded') expect(isValidTransition('discarded', s)).toBe(false); });
    });
    it('rejects available → returned (invalid)', () => { expect(isValidTransition('available', 'returned')).toBe(false); });
  });

  describe('getAllowedTransitions', () => {
    it('returns transitions for available', () => {
      expect(getAllowedTransitions('available')).toEqual(['listed', 'sold', 'donated', 'discarded']);
    });
    it('returns empty for donated (terminal)', () => { expect(getAllowedTransitions('donated')).toEqual([]); });
    it('returns empty for discarded (terminal)', () => { expect(getAllowedTransitions('discarded')).toEqual([]); });
  });

  describe('labels', () => {
    it('has labels for all statuses', () => {
      ALL_STATUSES.forEach((s) => { expect(STATUS_LABELS[s]).toBeTruthy(); });
    });
    it('has labels for admin and user only', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.user).toBe('Standard User');
      expect(Object.keys(ROLE_LABELS)).toHaveLength(2);
    });
  });
});
