/**
 * Date helpers. The whole system treats a stay as a half-open interval
 * `[check_in, check_out)` — the night of check-out is not occupied, which is
 * what allows a room to be handed over on the same morning it is vacated.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse `YYYY-MM-DD` into a UTC-midnight Date. Returns null when invalid. */
export function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates such as 2026-02-31, which Date.UTC would roll over.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Format a Date as `YYYY-MM-DD` in UTC. */
export function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

/** Today's date as `YYYY-MM-DD` in UTC. */
export function today() {
  const now = new Date();
  return formatDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

/** Whole nights between two dates. */
export function nightsBetween(checkIn, checkOut) {
  const start = typeof checkIn === 'string' ? parseDate(checkIn) : checkIn;
  const end = typeof checkOut === 'string' ? parseDate(checkOut) : checkOut;
  if (!start || !end) return 0;
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

/** Shift a date string by a number of days. */
export function addDays(date, days) {
  const base = typeof date === 'string' ? parseDate(date) : date;
  return formatDate(new Date(base.getTime() + days * DAY_MS));
}

/**
 * True when two half-open date ranges overlap.
 * `[aStart, aEnd)` overlaps `[bStart, bEnd)` iff aStart < bEnd && aEnd > bStart.
 */
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/** A list of every date string in the half-open range `[start, end)`. */
export function eachNight(start, end) {
  const nights = [];
  let cursor = start;
  let guard = 0;
  while (cursor < end && guard < 365) {
    nights.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }
  return nights;
}
