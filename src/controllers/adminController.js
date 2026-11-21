import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne } from '../config/db.js';
import { config } from '../config/index.js';
import {
  sendBookingConfirmationEmail,
  sendPaymentDetailsEmail,
  sendEmail,
  getRecentEmails,
} from '../services/emailService.js';
import { getBookingByReference, serialiseBooking } from '../services/bookingService.js';

/* ─────────────────────────────────────────────────────────────
 * Admin Authentication
 * ───────────────────────────────────────────────────────────── */
export async function login(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: { code: 'bad_request', message: 'Username and password are required.' },
    });
  }

  const user = await queryOne(
    'SELECT id, username, password_hash, email, role FROM admin_users WHERE username = ?',
    [username.trim()]
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'invalid_credentials', message: 'Invalid username or password.' },
    });
  }

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    return res.status(401).json({
      success: false,
      error: { code: 'invalid_credentials', message: 'Invalid username or password.' },
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    config.admin.jwtSecret,
    { expiresIn: '7d' }
  );

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  });
}

export async function me(req, res) {
  return res.json({
    success: true,
    data: { user: req.user },
  });
}

/* ─────────────────────────────────────────────────────────────
 * Dashboard Overview
 * ───────────────────────────────────────────────────────────── */
export async function getDashboard(req, res) {
  // Aggregate stats
  const totalBookingsRow = await queryOne('SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS revenue FROM bookings');
  const pendingBookingsRow = await queryOne("SELECT COUNT(*) AS count FROM bookings WHERE status = 'pending'");
  const confirmedBookingsRow = await queryOne("SELECT COUNT(*) AS count FROM bookings WHERE status = 'confirmed'");
  const enquiriesCountRow = await queryOne("SELECT COUNT(*) AS count FROM enquiries WHERE status = 'new'");
  const conciergeCountRow = await queryOne("SELECT COUNT(*) AS count FROM concierge_requests WHERE status = 'pending'");

  // Recent bookings
  const recentBookings = await query(`
    SELECT b.*, r.name AS room_name
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
     ORDER BY b.created_at DESC
     LIMIT 10
  `);

  // Active rooms
  const rooms = await query('SELECT id, name, slug, base_price, capacity, total_inventory, image_url FROM rooms ORDER BY id ASC');

  // Recent enquiries
  const recentEnquiries = await query(`
    SELECT id, name, email, phone, subject, message, status, created_at, 'inquiry' as source
      FROM enquiries
     ORDER BY created_at DESC
     LIMIT 10
  `);

  return res.json({
    success: true,
    data: {
      stats: {
        totalBookings: totalBookingsRow?.count || 0,
        totalRevenue: Number(totalBookingsRow?.revenue || 0),
        pendingBookings: pendingBookingsRow?.count || 0,
        confirmedBookings: confirmedBookingsRow?.count || 0,
        pendingEnquiries: (enquiriesCountRow?.count || 0) + (conciergeCountRow?.count || 0),
        roomCount: rooms.length,
      },
      rooms,
      recentBookings: recentBookings.map((b) => ({
        ...serialiseBooking(b),
        roomName: b.room_name,
      })),
      recentEnquiries,
      recentEmails: getRecentEmails().slice(0, 10),
    },
  });
}

/* ─────────────────────────────────────────────────────────────
 * Bookings Management
 * ───────────────────────────────────────────────────────────── */
export async function listAllBookings(req, res) {
  const { status, search, limit = 100, offset = 0 } = req.query;
  const conditions = [];
  const params = [];

  if (status && ['pending', 'confirmed', 'cancelled'].includes(status)) {
    conditions.push('b.status = ?');
    params.push(status);
  }

  if (search) {
    conditions.push('(b.booking_reference LIKE ? OR b.guest_name LIKE ? OR b.guest_email LIKE ? OR b.guest_phone LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(`
    SELECT b.*, r.name AS room_name, r.slug AS room_slug
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      ${where}
     ORDER BY b.created_at DESC
     LIMIT ? OFFSET ?
  `, [...params, Number(limit) || 100, Number(offset) || 0]);

  return res.json({
    success: true,
    data: {
      bookings: rows.map((b) => ({
        ...serialiseBooking(b),
        roomName: b.room_name,
        roomSlug: b.room_slug,
      })),
      count: rows.length,
    },
  });
}

export async function updateBookingStatus(req, res) {
  const { id } = req.params;
  const { status, sendEmailNotification = true } = req.body;

  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: { code: 'bad_request', message: 'Status must be pending, confirmed, or cancelled.' },
    });
  }

  // Find booking by ID or reference
  const row = await queryOne(
    `SELECT b.*, r.name AS room_name, r.slug AS room_slug, r.base_price AS room_base_price
       FROM bookings b
       JOIN rooms r ON r.id = b.room_id
      WHERE b.id = ? OR b.booking_reference = ?`,
    [id, id]
  );

  if (!row) {
    return res.status(404).json({
      success: false,
      error: { code: 'not_found', message: 'Booking not found.' },
    });
  }

  await query('UPDATE bookings SET status = ? WHERE id = ?', [status, row.id]);

  const booking = {
    ...serialiseBooking({ ...row, status }),
    room: { name: row.room_name, slug: row.room_slug, basePrice: Number(row.room_base_price) },
  };

  let emailResult = null;
  // If status is updated to confirmed and sendEmailNotification is true, automatically send confirmation email!
  if (status === 'confirmed' && sendEmailNotification) {
    emailResult = await sendBookingConfirmationEmail(booking);
  }

  return res.json({
    success: true,
    message: `Booking status updated to ${status}.${emailResult ? ' Confirmation email sent.' : ''}`,
    data: {
      booking,
      emailSent: Boolean(emailResult?.success),
    },
  });
}

export async function sendPaymentLink(req, res) {
  const { id } = req.params;
  const { paymentLink, customNotes } = req.body;

  const booking = await getBookingByReference(id);
  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'not_found', message: 'Booking not found.' },
    });
  }

  const result = await sendPaymentDetailsEmail(booking, { paymentLink, customNotes });

  return res.json({
    success: true,
    message: 'Payment details and instructions email dispatched to guest.',
    data: {
      bookingReference: booking.reference,
      guestEmail: booking.guestEmail,
      result,
    },
  });
}

/* ─────────────────────────────────────────────────────────────
 * Room Price Management (Dynamic Price Change)
 * ───────────────────────────────────────────────────────────── */
export async function getRooms(req, res) {
  const rooms = await query('SELECT id, name, slug, base_price, capacity, total_inventory, image_url FROM rooms ORDER BY id ASC');
  return res.json({
    success: true,
    data: {
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        basePrice: Number(r.base_price),
        capacity: r.capacity,
        totalInventory: r.total_inventory,
        imageUrl: r.image_url,
      })),
    },
  });
}

export async function updateRoomPrice(req, res) {
  const { id } = req.params;
  const price = Number(req.body.basePrice ?? req.body.price);

  if (!Number.isFinite(price) || price < 0) {
    return res.status(400).json({
      success: false,
      error: { code: 'invalid_price', message: 'Price must be a positive number.' },
    });
  }

  // Update room by id or slug
  const result = await query(
    'UPDATE rooms SET base_price = ? WHERE id = ? OR slug = ?',
    [price, id, id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'room_not_found', message: 'Room not found.' },
    });
  }

  const updated = await queryOne('SELECT id, name, slug, base_price, capacity FROM rooms WHERE id = ? OR slug = ?', [id, id]);

  return res.json({
    success: true,
    message: `Price for "${updated.name}" updated to ₹${price.toLocaleString('en-IN')}/night.`,
    data: {
      room: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        basePrice: Number(updated.base_price),
        capacity: updated.capacity,
      },
    },
  });
}

/* ─────────────────────────────────────────────────────────────
 * Enquiries & Concierge Requests Management
 * ───────────────────────────────────────────────────────────── */
export async function listEnquiries(req, res) {
  const enquiries = await query(`
    SELECT id, name, email, phone, room_id, subject, message, status, created_at, 'inquiry' AS type
      FROM enquiries
     ORDER BY created_at DESC
  `);

  const concierge = await query(`
    SELECT id, guest_name AS name, guest_email AS email, guest_phone AS phone,
           service_type AS subject, notes AS message, status, created_at, 'concierge' AS type,
           requested_date
      FROM concierge_requests
     ORDER BY created_at DESC
  `);

  const combined = [...enquiries, ...concierge].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return res.json({
    success: true,
    data: {
      enquiries: combined,
      count: combined.length,
    },
  });
}

export async function updateEnquiryStatus(req, res) {
  const { id } = req.params;
  const { status, type = 'inquiry' } = req.body;

  if (type === 'concierge') {
    await query('UPDATE concierge_requests SET status = ? WHERE id = ?', [status, id]);
  } else {
    await query('UPDATE enquiries SET status = ? WHERE id = ?', [status, id]);
  }

  return res.json({
    success: true,
    message: 'Status updated successfully.',
  });
}

export async function replyToEnquiry(req, res) {
  const { to, subject, message, enquiryId } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      success: false,
      error: { code: 'bad_request', message: 'Recipient email and message are required.' },
    });
  }

  const result = await sendEmail({
    to,
    subject: subject || 'Response from Ancestral Abode Homestay, Jaipur',
    html: `
      <div style="font-family: Georgia, serif; font-size: 15px; color: #2a221b; line-height: 1.7; max-width: 600px; margin: 20px auto; border: 1px solid #ebdcc5; border-radius: 8px; padding: 24px; background: #fff;">
        <h2 style="color: #1a1512; margin-top: 0; font-weight: normal; border-bottom: 2px solid #c89d56; padding-bottom: 8px;">Ancestral Abode Homestay</h2>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr style="border: none; border-top: 1px dashed #e6dbcb; margin: 24px 0;">
        <p style="font-size: 13px; color: #76695e;">
          Ancestral Abode Homestay<br>
          34, Karnoth House, Ramganj Chopad, Jaipur<br>
          Phone / WhatsApp: (+91) 9660041516 &bull; Email: ancestralabodehomestay@gmail.com
        </p>
      </div>
    `,
  });

  if (enquiryId) {
    await query("UPDATE enquiries SET status = 'responded' WHERE id = ?", [enquiryId]).catch(() => {});
  }

  return res.json({
    success: true,
    message: 'Reply sent successfully.',
    data: { result },
  });
}
