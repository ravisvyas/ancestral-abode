import { query } from '../config/db.js';
import {
  getAvailabilityMatrix,
  serialiseRoom,
} from '../services/availabilityService.js';
import { validateStayWindow } from '../services/availabilityService.js';
import { config } from '../config/index.js';

export async function listRooms(req, res) {
  const { guests } = req.query;
  const rooms = await query('SELECT * FROM rooms ORDER BY base_price ASC');
  const payload = rooms.map((row) => {
    const room = serialiseRoom(row);
    return {
      ...room,
      description: describeRoom(room.slug),
      suitableFor: room.capacity,
    };
  });
  const filtered = guests ? payload.filter((room) => room.capacity >= Number(guests)) : payload;
  res.json({ success: true, data: { rooms: filtered, count: filtered.length } });
}

export async function getRoom(req, res) {
  const rows = await query('SELECT * FROM rooms WHERE slug = ? OR id = ?', [
    req.params.slug,
    Number(req.params.slug) || 0,
  ]);
  if (!rows.length) {
    return res.status(404).json({
      success: false,
      error: { code: 'room_not_found', message: 'We could not find that room.' },
    });
  }
  const room = serialiseRoom(rows[0]);
  const gallery = await query(
    'SELECT image_url, caption FROM room_gallery WHERE room_id = ? ORDER BY sort_order ASC',
    [room.id]
  );
  return res.json({
    success: true,
    data: {
      room: {
        ...room,
        description: describeRoom(room.slug),
        gallery: gallery.map((item) => ({ imageUrl: item.image_url, caption: item.caption })),
      },
    },
  });
}

export async function checkAvailability(req, res) {
  const { checkIn, checkOut, guests } = req.query;
  const window = validateStayWindow(checkIn, checkOut);

  if (!window.valid) {
    const matrix = await getAvailabilityMatrix({ checkIn, checkOut, guests });
    return res.status(400).json({
      success: false,
      error: {
        code: 'invalid_dates',
        message: window.errors[0],
        details: { errors: window.errors },
      },
      data: { rooms: matrix.map(summarise) },
    });
  }

  const matrix = await getAvailabilityMatrix({ checkIn, checkOut, guests });
  const available = matrix.filter((room) => room.isAvailable);

  return res.json({
    success: true,
    data: {
      checkIn,
      checkOut,
      nights: window.nights,
      guests,
      rooms: matrix.map(summarise),
      availableCount: available.length,
      totalCount: matrix.length,
      currency: 'INR',
      serviceFeePercent: config.booking.serviceFeePercent,
      taxPerNight: config.booking.taxPerNight,
    },
  });
}

export async function getExperiences(req, res) {
  const rows = await query('SELECT * FROM experiences ORDER BY id ASC');
  res.json({
    success: true,
    data: {
      experiences: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        durationMinutes: row.duration_minutes,
        price: Number(row.price),
        maxGuests: row.max_guests,
        description: row.description,
        imageUrl: row.image_url,
      })),
    },
  });
}

export async function getSights(req, res) {
  const rows = await query('SELECT * FROM sights ORDER BY sort_order ASC');
  res.json({
    success: true,
    data: {
      sights: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        distanceLabel: row.distance_label,
        distanceMinutes: row.distance_minutes,
        summary: row.summary,
        imageUrl: row.image_url,
      })),
    },
  });
}

export async function getReviews(req, res) {
  const rows = await query('SELECT * FROM reviews ORDER BY sort_order ASC');
  res.json({
    success: true,
    data: {
      reviews: rows.map((row) => ({
        id: row.id,
        guestName: row.guest_name,
        guestOrigin: row.guest_origin,
        rating: row.rating,
        quote: row.quote,
        source: row.source,
        sourceDetail: row.source_detail,
      })),
    },
  });
}

export async function getJournal(req, res) {
  const rows = await query('SELECT * FROM journal_posts ORDER BY published_at DESC');
  res.json({
    success: true,
    data: {
      posts: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: row.category,
        excerpt: row.excerpt,
        readMinutes: row.read_minutes,
        publishedAt:
          row.published_at instanceof Date
            ? row.published_at.toISOString().slice(0, 10)
            : row.published_at,
        imageUrl: row.image_url,
      })),
    },
  });
}

function summarise(room) {
  return {
    id: room.id,
    name: room.name,
    slug: room.slug,
    basePrice: room.basePrice,
    capacity: room.capacity,
    unitsAvailable: room.unitsAvailable,
    unitsTotal: room.unitsTotal,
    amenities: room.amenities,
    imageUrl: room.imageUrl,
    nights: room.nights,
    price: room.price,
    isAvailable: room.isAvailable,
    fitsParty: room.fitsParty,
  };
}

function describeRoom(slug) {
  const copy = {
    'chhatri-heritage-suite':
      'A signature heritage suite featuring a soaring vaulted arch ceiling, canopied king bed, original Rajasthani miniature artworks, and private ensuite bath accessed via a classic sandstone arch.',
    'courtyard-haveli-room':
      'An intimate ground-level chamber boasting authentic black-and-white checkered marble flooring, illuminated jharokha wall alcoves, reading armchairs, and direct access to the sunlit courtyard.',
    'royal-empress-chamber':
      'An exquisitely restored twin chamber framed by handcrafted Rajasthani jharokha fretwork, twin teak beds, warm ambient lamps, and a custom rain shower bathroom.',
    'temple-bell-studio':
      'A tranquil garden-facing twin room adorned with traditional hand-block printed textiles, bespoke teak armoires, an artisan vanity mirror, and modern comforts.',
    'zen-courtyard-suite':
      'A stately master suite with high ceilings, antique heirloom accents, connected private lounge seating, and an expansive luxury washroom.',
  };
  return copy[slug] ?? '';
}
