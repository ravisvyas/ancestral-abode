import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, validate } from '../middleware/index.js';
import { requireAdminAuth } from '../middleware/auth.js';
import {
  roomQuerySchema,
  availabilitySchema,
  bookingSchema,
  bookingStatusSchema,
  conciergeSchema,
  newsletterSchema,
} from '../validators/schemas.js';
import {
  listRooms,
  getRoom,
  checkAvailability,
  getExperiences,
  getSights,
  getReviews,
  getJournal,
} from '../controllers/catalogueController.js';
import {
  postBooking,
  getBooking,
  getBookings,
  patchBookingStatus,
  postConcierge,
  postEnquiry,
  postNewsletter,
} from '../controllers/bookingController.js';
import * as admin from '../controllers/adminController.js';
import { pingDatabase } from '../config/db.js';

export const router = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'rate_limited', message: 'Too many requests. Please try again shortly.' },
  },
});

/* ------------------------------------------------------------------ *
 *  Health
 * ------------------------------------------------------------------ */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    let db = 'down';
    try {
      db = (await pingDatabase()) ? 'up' : 'down';
    } catch {
      db = 'down';
    }
    res.status(db === 'up' ? 200 : 503).json({
      success: db === 'up',
      data: { status: db === 'up' ? 'healthy' : 'degraded', database: db, uptime: process.uptime() },
    });
  })
);

/* ------------------------------------------------------------------ *
 *  Catalogue
 * ------------------------------------------------------------------ */
router.get('/rooms', validate(roomQuerySchema, 'query'), asyncHandler(listRooms));
router.get('/rooms/:slug', asyncHandler(getRoom));
router.get(
  '/availability',
  validate(availabilitySchema, 'query'),
  asyncHandler(checkAvailability)
);
router.get('/experiences', asyncHandler(getExperiences));
router.get('/sights', asyncHandler(getSights));
router.get('/reviews', asyncHandler(getReviews));
router.get('/journal', asyncHandler(getJournal));

/* ------------------------------------------------------------------ *
 *  Bookings
 * ------------------------------------------------------------------ */
router.post('/bookings', writeLimiter, validate(bookingSchema), asyncHandler(postBooking));
router.get('/bookings', asyncHandler(getBookings));
router.get('/bookings/:reference', asyncHandler(getBooking));
router.patch(
  '/bookings/:reference/status',
  writeLimiter,
  validate(bookingStatusSchema),
  asyncHandler(patchBookingStatus)
);

/* ------------------------------------------------------------------ *
 *  Enquiries & User Requests
 * ------------------------------------------------------------------ */
router.post(
  '/concierge',
  writeLimiter,
  validate(conciergeSchema),
  asyncHandler(postConcierge)
);
router.post(
  '/enquiries',
  writeLimiter,
  asyncHandler(postEnquiry)
);
router.post(
  '/newsletter',
  writeLimiter,
  validate(newsletterSchema),
  asyncHandler(postNewsletter)
);

/* ------------------------------------------------------------------ *
 *  Admin Management Portal Routes
 * ------------------------------------------------------------------ */
// Auth
router.post('/admin/auth/login', writeLimiter, asyncHandler(admin.login));
router.get('/admin/auth/me', requireAdminAuth, asyncHandler(admin.me));

// Dashboard & Stats
router.get('/admin/dashboard', requireAdminAuth, asyncHandler(admin.getDashboard));

// Bookings
router.get('/admin/bookings', requireAdminAuth, asyncHandler(admin.listAllBookings));
router.patch('/admin/bookings/:id/status', requireAdminAuth, asyncHandler(admin.updateBookingStatus));
router.post('/admin/bookings/:id/send-payment-link', requireAdminAuth, asyncHandler(admin.sendPaymentLink));

// Rooms & Dynamic Pricing
router.get('/admin/rooms', requireAdminAuth, asyncHandler(admin.getRooms));
router.patch('/admin/rooms/:id/price', requireAdminAuth, asyncHandler(admin.updateRoomPrice));

// Enquiries & Concierge
router.get('/admin/enquiries', requireAdminAuth, asyncHandler(admin.listEnquiries));
router.patch('/admin/enquiries/:id/status', requireAdminAuth, asyncHandler(admin.updateEnquiryStatus));
router.post('/admin/enquiries/reply', requireAdminAuth, asyncHandler(admin.replyToEnquiry));
