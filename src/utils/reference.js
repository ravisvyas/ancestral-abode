import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike glyphs

/** `AA-BB-1234` — short, human-readable and unambiguous over the phone. */
export function generateBookingReference() {
  const bytes = crypto.randomBytes(6);
  let body = '';
  for (let i = 0; i < 6; i += 1) {
    body += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `AA-${body.slice(0, 2)}-${body.slice(2)}`;
}

/** Human-friendly confirmation token for concierge and newsletter flows. */
export function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}
