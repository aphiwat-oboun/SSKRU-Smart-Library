/**
 * ============================================================================
 * SRC/UTILS/LIBRARYHOURS.TS — Library Operating & Closing Hours (16:00)
 * ============================================================================
 */

export const LIBRARY_CLOSING_HOUR = 16; // ห้องสมุดปิด 16:00 น.
export const LIBRARY_CLOSING_MINUTE = 0;
export const LIBRARY_CLOSING_LABEL = '16:00';

/**
 * Returns true when current local time is at or past library closing time (16:00).
 */
export function isPastLibraryClosingTime(now: Date = new Date()): boolean {
  const minsNow = now.getHours() * 60 + now.getMinutes();
  const closingMins = LIBRARY_CLOSING_HOUR * 60 + LIBRARY_CLOSING_MINUTE;
  return minsNow >= closingMins;
}

/**
 * Computes remaining minutes until either expectedEndTime or 16:00 closing time
 * (whichever comes first).
 */
export function getRemainingMinutesBeforeClose(
  expectedEndIso?: string,
  elapsedSec = 0,
  quotaSec = 180 * 60,
  now: Date = new Date()
): { remainingMinutes: number; isOvertime: boolean; isPastClosing: boolean } {
  const isPastClosing = isPastLibraryClosingTime(now);
  if (isPastClosing) {
    return { remainingMinutes: 0, isOvertime: true, isPastClosing: true };
  }

  const closingToday = new Date(now);
  closingToday.setHours(LIBRARY_CLOSING_HOUR, LIBRARY_CLOSING_MINUTE, 0, 0);

  let targetEndMs = expectedEndIso
    ? new Date(expectedEndIso).getTime()
    : now.getTime() + Math.max(0, quotaSec - elapsedSec) * 1000;

  // Never allow usage time to exceed 16:00 closing time
  if (targetEndMs > closingToday.getTime()) {
    targetEndMs = closingToday.getTime();
  }

  const diffMs = targetEndMs - now.getTime();
  return {
    remainingMinutes: Math.max(0, Math.ceil(diffMs / 60000)),
    isOvertime: diffMs <= 0,
    isPastClosing: false
  };
}
