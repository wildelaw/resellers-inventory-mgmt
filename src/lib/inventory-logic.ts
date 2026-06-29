/**
 * Shared inventory status-transition logic: validates transitions and computes
 * the removalDate side effect. v2: NO auto $0 sales for donated/discarded.
 */
import { isValidTransition, isRemovalStatus } from './constants';
import type { ItemStatus } from './constants';
import { ApiErrors } from './api-errors';
import { nowTs } from './schema';

export interface StatusUpdateResult {
  status: ItemStatus;
  removalDate: number | null;
  updatedAt: number;
}

/**
 * Given a current status and a requested target status, validate the transition
 * and compute removalDate.
 *  - to donated/discarded: removalDate = now
 *  - returned -> available: removalDate = null
 *  - to sold: caller sets removalDate = soldDate elsewhere (sale flow)
 *  - otherwise: keep existing removalDate (caller passes through)
 */
export function computeStatusUpdate(
  currentStatus: ItemStatus,
  targetStatus: ItemStatus,
  existingRemovalDate: number | null,
): StatusUpdateResult {
  if (!isValidTransition(currentStatus, targetStatus)) {
    throw ApiErrors.BadRequest(`Invalid status transition: ${currentStatus} -> ${targetStatus}`);
  }
  let removalDate = existingRemovalDate ?? null;
  if (isRemovalStatus(targetStatus)) {
    removalDate = nowTs();
  } else if (currentStatus === 'returned' && targetStatus === 'available') {
    removalDate = null;
  }
  return { status: targetStatus, removalDate, updatedAt: nowTs() };
}