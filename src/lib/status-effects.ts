import type { ItemStatus } from './constants';

export interface StatusSideEffects {
  removalDate?: Date | null;
}

/**
 * Side effects of an item status change, per the design spec:
 *  - → sold/donated/discarded: removalDate set (sold normally happens through
 *    sale creation, where removalDate = soldDate)
 *  - → available (from returned): removalDate cleared
 *  - No $0 sale records are ever auto-created for donated/discarded — these
 *    are inventory dispositions tracked via removalDate, not sales.
 */
export function statusSideEffects(nextStatus: ItemStatus): StatusSideEffects {
  switch (nextStatus) {
    case 'sold':
    case 'donated':
    case 'discarded':
      return { removalDate: new Date() };
    case 'available':
      return { removalDate: null };
    default:
      return {};
  }
}