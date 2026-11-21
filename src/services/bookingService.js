import { query, queryOne, withTransaction } from '../config/db.js';
import { generateBookingReference } from '../utils/reference.js';
import { priceStay } from './pricingService.js';
import { countOccupiedRooms, validateStayWindow, serialiseRoom } from './availabilityService.js';
import { config } from '../config/index.js';

export class BookingError extends Error {
  constructor(message, code = 'booking_error', status = 400, details = undefined) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Create a reservation.
 *
 * The room row is locked with `SELECT ... FOR UPDATE` before availability is
 * counted, so two concurrent requests for the same room can never both pass
 * the availability check — the second one waits, re-counts, and is rejected.
 */
export async function createBooking(payload) {
  const window = validateStayWindow(payload.checkIn, payload.checkOut);
  if (!window.valid) {
    throw new BookingError('The requested dates are not valid.', 'invalid_dates', 400, window.errors);
  }

  const guests = Number(payload.guests);
  if (!Number.isInteger(guests) || guests < 1) {
    throw new BookingError('At least one guest is required.', 'invalid_guests', 400);
  }

  return withTransaction(async (connection) => {
    const [roomRows] = await connection.execute(
      'SELECT * FROM rooms WHERE id = ? FOR UPDATE',
      [payload.roomId]
    );
    const room = roomRows[0];

    if (!room) {
      throw new BookingError('That room is no longer available.', 'room_not_found', 404);
    }
    if (guests > room.capacity) {
      throw new BookingError(
        `${room.name} accommodates up to ${room.capacity} guests.`,
        'capacity_exceeded',
        400,
        { capacity: room.capacity }
      );
    }

    const occupied = await countOccupiedRooms(
      room.id,
      payload.checkIn,
      payload.checkOut,
      connection
    );
    if (occupied >= room.total_inventory) {
      throw new BookingError(
        `${room.name} is fully booked for those dates.`,
        'no_availability',
        409,
        { room: room.name }
      );
    }

    const pricing = priceStay({
      basePrice: room.base_price,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut,
    });

    const reference = await uniqueReference();

    await connection.execute(
      `INSERT INTO bookings
         (booking_reference, room_id, guest_name, guest_email, guest_phone,
          check_in, check_out, guests_count, total_nights, total_amount,
          special_requests, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        reference,
        room.id,
        payload.guestName,
        payload.guestEmail,
        payload.guestPhone,
        payload.checkIn,
        payload.checkOut,
        guests,
        pricing.nights,
        pricing.total,
        payload.specialRequests || null,
      ]
    );

    const [created] = await connection.execute(
      'SELECT * FROM bookings WHERE booking_reference = ?',
      [reference]
    );

    return {
      ...serialiseBooking(created),
      room: serialiseRoom(room),
      breakdown: pricing,
    };
  });
}

/** Retry on the (astronomically unlikely) reference collision. */
async function uniqueReference(attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    const reference = generateBookingReference();
    const existing = await queryOne('SELECT id FROM bookings WHERE booking_reference = ?', [reference]);
    if (!existing) return reference;
  }
  throw new BookingError('Could not allocate a booking reference.', 'reference_failed', 500);
}

/** Fetch one booking by its human-readable reference. */
export async function getBookingByReference(reference) {
  const row = await queryOne(
    `SELECT b.*, r.name AS room_name, r.slug AS room_slug, r.base_price AS room_base_price
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE b.booking_reference = ?`,
    [reference]
  );
  if (!row) return null;
  const room = {
    name: row.room_name,
    slug: row.room_slug,
    basePrice: Number(row.room_base_price),
  };
  return { ...serialiseBooking(row), room, breakdown: breakdownFor(row) };
}

export async function listBookings({ email, status, limit = 50, offset = 0 } = {}) {
  const clauses = [];
  const params = [];
  if (email) {
    clauses.push('guest_email = ?');
    params.push(email);
  }
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await query(
    `SELECT b.*, r.name AS room_name, r.slug AS room_slug
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows.map((row) => ({
    ...serialiseBooking(row),
    room: { name: row.room_name, slug: row.room_slug },
    breakdown: breakdownFor(row),
  }));
}

/** Update the lifecycle status of a booking. */
export async function updateBookingStatus(reference, status) {
  const row = await queryOne(
    'SELECT * FROM bookings WHERE booking_reference = ?',
    [reference]
  );
  if (!row) return null;
  await query('UPDATE bookings SET status = ? WHERE booking_reference = ?', [status, reference]);
  return { ...serialiseBooking(row), status };
}

function breakdownFor(row) {
  const nights = Number(row.total_nights);
  const total = Number(row.total_amount);
  const serviceFeePercent = config.booking.serviceFeePercent;
  const taxes = Math.round(config.booking.taxPerNight * nights * 100) / 100;
  const serviceFee = Math.round(((total - taxes) / (1 + serviceFeePercent / 100)) * serviceFeePercent * 100) / 100;
  const subtotal = Math.round((total - taxes - serviceFee) * 100) / 100;
  return { nights, subtotal, serviceFee, taxes, total };
}

export function serialiseBooking(row) {
  return {
    id: row.id,
    reference: row.booking_reference,
    roomId: row.room_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    checkIn: row.check_in instanceof Date ? row.check_in.toISOString().slice(0, 10) : row.check_in,
    checkOut: row.check_out instanceof Date ? row.check_out.toISOString().slice(0, 10) : row.check_out,
    guests: row.guests_count,
    totalNights: row.total_nights,
    totalAmount: Number(row.total_amount),
    specialRequests: row.special_requests,
    status: row.status,
    createdAt: row.created_at,
  };
}
