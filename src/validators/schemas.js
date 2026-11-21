import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'Not a valid calendar date');

export const roomQuerySchema = z.object({
  guests: z.coerce.number().int().min(1).max(20).optional(),
  checkIn: isoDate.optional(),
  checkOut: isoDate.optional(),
});

export const availabilitySchema = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.coerce.number().int().min(1).max(20).default(2),
});

export const bookingSchema = z.object({
  roomId: z.coerce.number().int().positive(),
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.coerce.number().int().min(1).max(20),
  guestName: z.string().trim().min(2, 'Please tell us your name').max(120),
  guestEmail: z.string().trim().toLowerCase().email('Please enter a valid email').max(120),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s()-]{8,20}$/, 'Please enter a valid phone number'),
  specialRequests: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const bookingStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']),
});

export const conciergeSchema = z.object({
  guestName: z.string().trim().min(2).max(120),
  guestPhone: z
    .string()
    .trim()
    .regex(/^[+]?[\d\s()-]{8,20}$/, 'Please enter a valid phone number'),
  guestEmail: z.string().trim().toLowerCase().email().max(120).optional().or(z.literal('')),
  serviceType: z
    .enum(['concierge_car', 'airport_transfer', 'local_tour', 'general'])
    .default('concierge_car'),
  destination: z.string().trim().max(160).optional().or(z.literal('')),
  requestedDate: isoDate.optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email').max(120),
});

export const lookupSchema = z.object({
  reference: z.string().trim().min(6).max(20),
  email: z.string().trim().toLowerCase().email().max(120).optional(),
});
