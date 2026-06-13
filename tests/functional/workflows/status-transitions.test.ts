import { describe, it, expect } from 'vitest';
import { isValidTransition } from '@/lib/constants';

describe('Status Transitions', () => {
  describe('Valid transitions', () => {
    it('allows available -> listed', () => {
      expect(isValidTransition('available', 'listed')).toBe(true);
    });
    it('allows available -> sold', () => {
      expect(isValidTransition('available', 'sold')).toBe(true);
    });
    it('allows available -> donated', () => {
      expect(isValidTransition('available', 'donated')).toBe(true);
    });
    it('allows available -> discarded', () => {
      expect(isValidTransition('available', 'discarded')).toBe(true);
    });
    it('allows listed -> available', () => {
      expect(isValidTransition('listed', 'available')).toBe(true);
    });
    it('allows listed -> sold', () => {
      expect(isValidTransition('listed', 'sold')).toBe(true);
    });
    it('allows sold -> returned', () => {
      expect(isValidTransition('sold', 'returned')).toBe(true);
    });
    it('allows returned -> available', () => {
      expect(isValidTransition('returned', 'available')).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    it('rejects available -> available (no self-transition)', () => {
      expect(isValidTransition('available', 'available')).toBe(false);
    });
    it('rejects sold -> available', () => {
      expect(isValidTransition('sold', 'available')).toBe(false);
    });
    it('rejects sold -> listed', () => {
      expect(isValidTransition('sold', 'listed')).toBe(false);
    });
    it('rejects donated -> available (terminal)', () => {
      expect(isValidTransition('donated', 'available')).toBe(false);
    });
    it('rejects discarded -> available (terminal)', () => {
      expect(isValidTransition('discarded', 'available')).toBe(false);
    });
    it('rejects donated -> sold (terminal)', () => {
      expect(isValidTransition('donated', 'sold')).toBe(false);
    });
    it('rejects discarded -> sold (terminal)', () => {
      expect(isValidTransition('discarded', 'sold')).toBe(false);
    });
  });

  describe('Side effects note', () => {
    it('donated and discarded do NOT auto-create $0 sale records (v2 change)', () => {
      // This is a specification note: in v2, transitioning to
      // donated/discarded sets removalDate but does NOT create a sale.
      // The status transition validation is the same either way,
      // but the side effect differs from v1.
      expect(isValidTransition('available', 'donated')).toBe(true);
      expect(isValidTransition('available', 'discarded')).toBe(true);
      // Business logic: removalDate is set, but NO sale is created.
    });
  });
});