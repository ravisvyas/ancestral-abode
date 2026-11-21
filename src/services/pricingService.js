import { config } from '../config/index.js';
import { nightsBetween } from '../utils/dates.js';

/**
 * Price a stay. Amounts are rounded to two decimals at each step so the
 * arithmetic the guest sees always matches what is written to the database.
 */
export function priceStay({ basePrice, checkIn, checkOut }) {
  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) {
    return { nights: 0, subtotal: 0, serviceFee: 0, taxes: 0, total: 0, perNight: 0 };
  }

  const rate = Number(basePrice);
  const subtotal = round2(rate * nights);
  const serviceFee = round2((subtotal * config.booking.serviceFeePercent) / 100);
  const taxes = round2(config.booking.taxPerNight * nights);
  const total = round2(subtotal + serviceFee + taxes);

  return { nights, subtotal, serviceFee, taxes, total, perNight: rate };
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** Format an INR amount for display, e.g. 18500 -> "₹18,500". */
export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2,
  }).format(Number(amount));
}
