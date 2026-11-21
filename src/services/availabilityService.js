import { query, queryOne } from '../config/db.js';
import { nightsBetween, rangesOverlap, parseDate } from '../utils/dates.js';
import { config } from '../config/index.js';
import { priceStay } from './pricingService.js';

/**
 * Bookings that actually hold inventory: everything except 'cancelled'.
 */
const OCCUPYING_STATUSES = ['pending', 'confirmed'];

/**
 * Count the units of a room that are already spoken for across `[checkIn, checkOut)`.
 */
export async function countOccupiedRooms(roomId, checkIn, checkOut, connection = null) {
  const sql = `
    SELECT COUNT(*) AS occupied
      FROM bookings
     WHERE room_id = ?
       AND status IN (?, ?)
       AND check_in < ?
       AND check_out > ?
  `;
  const params = [roomId, ...OCCUPYING_STATUSES, checkOut, checkIn];
  const rows = connection
    ? await connection.execute(sql, params).then(([r]) => r)
    : await query(sql, params);
  return Number(rows[0]?.occupied ?? 0);
}

/**
 * Availability for one room. Returns units free, units total and the nights.
 */
export async function getRoomAvailability(roomId, checkIn, checkOut) {
  const room = await queryOne('SELECT * FROM rooms WHERE id = ?', [roomId]);
  if (!room) return null;

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    return { room, nights: 0, unitsTotal: room.total_inventory, unitsOccupied: 0, unitsAvailable: 0 };
  }

  const occupied = await countOccupiedRooms(roomId, checkIn, checkOut);
  const available = Math.max(0, room.total_inventory - occupied);

  return {
    room,
    nights,
    unitsTotal: room.total_inventory,
    unitsOccupied: occupied,
    unitsAvailable: available,
  };
}

/**
 * Availability for every room, with pricing for the requested window.
 */
export async function getAvailabilityMatrix({ checkIn, checkOut, guests = 1 }) {
  const rooms = await query('SELECT * FROM rooms ORDER BY base_price ASC');

  return Promise.all(
    rooms.map(async (room) => {
      const occupied = await countOccupiedRooms(room.id, checkIn, checkOut);
      const unitsAvailable = Math.max(0, room.total_inventory - occupied);
      const pricing = priceStay({ basePrice: room.base_price, checkIn, checkOut });
      return {
        ...serialiseRoom(room),
        nights: pricing.nights,
        unitsTotal: room.total_inventory,
        unitsOccupied: occupied,
        unitsAvailable,
        price: pricing,
        isAvailable: unitsAvailable > 0 && room.capacity >= guests,
        fitsParty: room.capacity >= guests,
      };
    })
  );
}

/**
 * Validate a requested window against house rules.
 * Returns `{ valid, errors }` — never throws, so it is safe to call from
 * both the availability endpoint and the booking write path.
 */
export function validateStayWindow(checkIn, checkOut, { maxAdvanceNights, maxStayNights } = config.booking) {
  const errors = [];
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);

  if (!start) errors.push('check_in must be a valid date in YYYY-MM-DD format');
  if (!end) errors.push('check_out must be a valid date in YYYY-MM-DD format');
  if (errors.length) return { valid: false, errors, nights: 0 };

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    errors.push('check_out must be at least one night after check_in');
    return { valid: false, errors, nights: 0 };
  }
  if (nights > maxStayNights) {
    errors.push(`stays are limited to ${maxStayNights} nights per reservation`);
  }

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (start < todayUtc) {
    errors.push('check_in cannot be in the past');
  }
  const horizon = new Date(todayUtc.getTime() + maxAdvanceNights * 86400000);
  if (start > horizon) {
    errors.push(`check_in cannot be more than ${maxAdvanceNights} days in advance`);
  }

  return { valid: errors.length === 0, errors, nights };
}

/** Normalise a DB row into the camelCase shape the API and UI use. */
export function serialiseRoom(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    basePrice: Number(row.base_price),
    capacity: row.capacity,
    totalInventory: row.total_inventory,
    amenities: parseJson(row.amenities) ?? [],
    imageUrl: row.image_url,
    createdAt: row.created_at,
  };
}

export function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export { rangesOverlap };
