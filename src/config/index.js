import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..', '..');

dotenv.config({ path: path.join(ROOT_DIR, '.env') });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 4000),
  host: process.env.HOST || '0.0.0.0',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3311),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'homestay_db',
    connectionLimit: toInt(process.env.DB_POOL_SIZE, 10),
  },

  booking: {
    maxAdvanceNights: toInt(process.env.MAX_ADVANCE_NIGHTS, 730),
    maxStayNights: toInt(process.env.MAX_STAY_NIGHTS, 30),
    // Service fee applied to the nightly subtotal, in percent.
    serviceFeePercent: Number.parseFloat(process.env.SERVICE_FEE_PERCENT ?? '6'),
    // Government tourism levy per night per room, in INR.
    taxPerNight: Number.parseFloat(process.env.TAX_PER_NIGHT ?? '500'),
    holdMinutes: toInt(process.env.BOOKING_HOLD_MINUTES, 15),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:4000,http://127.0.0.1:4000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  },

  admin: {
    jwtSecret: process.env.JWT_SECRET || 'ancestral-abode-secret-key-1892',
    defaultUsername: process.env.ADMIN_USERNAME || 'admin',
    defaultPassword: process.env.ADMIN_PASSWORD || 'AncestralAbode@2026',
  },

  email: {
    host: process.env.SMTP_HOST || '',
    port: toInt(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"Ancestral Abode Jaipur" <ancestralabodehomestay@gmail.com>',
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'ancestralabodehomestay@gmail.com',
  },
};

export const isProduction = config.env === 'production';
