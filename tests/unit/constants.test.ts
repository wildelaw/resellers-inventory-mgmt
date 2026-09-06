import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getAllowedTransitions,
  ALLOWED_TRANSITIONS,
  STATUS_LABELS,
  ROLE_LABELS,
  REFUND_TYPE_LABELS,
  ALL_STATUSES,
} from '@/lib/constants';

describe('isValidTransition', () => {
  it('allows available → listed/sold/donated/discarded', () => {
    expect(isValidTransition('available', 'listed')).toBe(true);
    expect(isValidTransition('available', 'sold')).toBe(true);
    expect(isValidTransition('available', 'donated')).toBe(true);
    expect(isValidTransition('available', 'discarded')).toBe(true);
  });

  it('allows listed → available/sold/donated/discarded', () => {
    expect(isValidTransition('listed', 'available')).toBe(true);
    expect(isValidTransition('listed', 'sold')).toBe(true);
    expect(isValidTransition('listed', 'donated')).toBe(true);
    expect(isValidTransition('listed', 'discarded')).toBe(true);
  });

  it('allows sold → returned and returned → available', () => {
    expect(isValidTransition('sold', 'returned')).toBe(true);
    expect(isValidTransition('returned', 'available')).toBe(true);
  });

  it('rejects invalid transitions', () => {
    expect(isValidTransition('sold', 'available')).toBe(false);
    expect(isValidTransition('sold', 'listed')).toBe(false);
    expect(isValidTransition('returned', 'sold')).toBe(false);
    expect(isValidTransition('donated', 'available')).toBe(false);
    expect(isValidTransition('discarded', 'available')).toBe(false);
    expect(isValidTransition('donated', 'sold')).toBe(false);
    expect(isValidTransition('available', 'returned')).toBe(false);
    expect(isValidTransition('listed', 'returned')).toBe(false);
  });

  it('allows same-status no-op transitions', () => {
    for (const status of ALL_STATUSES) {
      expect(isValidTransition(status, status)).toBe(true);
    }
  });

  it('returns empty transitions for terminal statuses', () => {
    expect(getAllowedTransitions('donated')).toEqual([]);
    expect(getAllowedTransitions('discarded')).toEqual([]);
  });

  it('returns the full transition table consistently', () => {
    for (const [from, tos] of Object.entries(ALLOWED_TRANSITIONS)) {
      expect(getAllowedTransitions(from as never)).toEqual(tos);
      for (const to of tos) {
        expect(isValidTransition(from as never, to)).toBe(true);
      }
    }
  });

  it('labels every status, role, and refund type', () => {
    expect(STATUS_LABELS.available).toBe('Available');
    expect(STATUS_LABELS.sold).toBe('Sold');
    expect(ROLE_LABELS.admin).toBe('Administrator');
    expect(ROLE_LABELS.user).toBe('Standard User');
    expect(REFUND_TYPE_LABELS.refund_no_return).toBe('Refund (No Return)');
    expect(REFUND_TYPE_LABELS.refund_with_return).toBe('Refund (With Return)');
  });
});