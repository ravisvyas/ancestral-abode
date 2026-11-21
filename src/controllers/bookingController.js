import { query, queryOne } from '../config/db.js';
import {
  createBooking,
  getBookingByReference,
  listBookings,
  updateBookingStatus,
  BookingError,
} from '../services/bookingService.js';
import {
  sendBookingConfirmationEmail,
  sendPaymentDetailsEmail,
  sendAdminNewBookingNotification,
  sendAdminNewEnquiryNotification,
} from '../services/emailService.js';

export async function postBooking(req, res) {
  const booking = await createBooking({
    roomId: req.body.roomId,
    checkIn: req.body.checkIn,
    checkOut: req.body.checkOut,
    guests: req.body.guests,
    guestName: req.body.guestName,
    guestEmail: req.body.guestEmail,
    guestPhone: req.body.guestPhone,
    specialRequests: req.body.specialRequests,
  });

  // Non-blocking email dispatch to guest and admin
  Promise.allSettled([
    sendPaymentDetailsEmail(booking),
    sendAdminNewBookingNotification(booking),
  ]).catch((err) => {
    console.error('[booking:email] Dispatch error:', err);
  });

  return res.status(201).json({
    success: true,
    message: 'Your stay is reserved. Booking details and payment instructions have been sent to your email.',
    data: { booking },
  });
}

export async function getBooking(req, res) {
  const booking = await getBookingByReference(req.params.reference);
  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'booking_not_found', message: 'We could not find that reservation.' },
    });
  }
  return res.json({ success: true, data: { booking } });
}

export async function getBookings(req, res) {
  const { email, status, limit = 50, offset = 0 } = req.query;
  const bookings = await listBookings({
    email,
    status,
    limit: Math.min(Number(limit) || 50, 200),
    offset: Number(offset) || 0,
  });
  res.json({ success: true, data: { bookings, count: bookings.length } });
}

export async function patchBookingStatus(req, res) {
  const booking = await updateBookingStatus(req.params.reference, req.body.status);
  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: 'booking_not_found', message: 'We could not find that reservation.' },
    });
  }

  // If status confirmed, dispatch booking confirmation email
  if (req.body.status === 'confirmed') {
    const fullBooking = await getBookingByReference(req.params.reference);
    if (fullBooking) {
      sendBookingConfirmationEmail(fullBooking).catch((err) => {
        console.error('[booking:confirm:email] Error:', err);
      });
    }
  }

  return res.json({ success: true, data: { booking } });
}

export async function postConcierge(req, res) {
  const {
    guestName,
    guestPhone,
    guestEmail,
    serviceType,
    destination,
    requestedDate,
    notes,
  } = req.body;

  const result = await query(
    `INSERT INTO concierge_requests
       (guest_name, guest_phone, guest_email, service_type, destination, requested_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      guestName,
      guestPhone,
      guestEmail || null,
      serviceType,
      destination || null,
      requestedDate || null,
      notes || null,
    ]
  );

  const request = {
    id: result.insertId,
    guestName,
    guestPhone,
    guestEmail: guestEmail || null,
    serviceType,
    destination: destination || null,
    requestedDate: requestedDate || null,
    notes: notes || null,
    status: 'pending',
  };

  sendAdminNewEnquiryNotification(request).catch((err) => {
    console.error('[concierge:email] Error:', err);
  });

  return res.status(201).json({
    success: true,
    message: 'Our concierge will call you within the hour.',
    data: { request },
  });
}

export async function postEnquiry(req, res) {
  const { name, email, phone, roomId, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: { code: 'bad_request', message: 'Name, email, and message are required.' },
    });
  }

  const result = await query(
    `INSERT INTO enquiries (name, email, phone, room_id, subject, message, status)
     VALUES (?, ?, ?, ?, ?, ?, 'new')`,
    [
      name,
      email,
      phone || null,
      roomId || null,
      subject || 'General Inquiry',
      message,
    ]
  );

  const enquiry = {
    id: result.insertId,
    name,
    email,
    phone: phone || null,
    roomId: roomId || null,
    subject: subject || 'General Inquiry',
    message,
    status: 'new',
  };

  sendAdminNewEnquiryNotification(enquiry).catch((err) => {
    console.error('[enquiry:email] Error:', err);
  });

  return res.status(201).json({
    success: true,
    message: 'Thank you for contacting Ancestral Abode. We have received your query and will respond shortly.',
    data: { enquiry },
  });
}

export async function postNewsletter(req, res) {
  const email = req.body.email;
  const existing = await queryOne('SELECT id FROM newsletter_subscribers WHERE email = ?', [email]);
  if (existing) {
    return res.json({
      success: true,
      message: 'You are already on the list — we will write soon.',
      data: { alreadySubscribed: true },
    });
  }
  await query('INSERT INTO newsletter_subscribers (email) VALUES (?)', [email]);
  return res.status(201).json({
    success: true,
    message: 'Welcome to the house. Your first letter is on its way.',
    data: { alreadySubscribed: false },
  });
}

export { BookingError };
