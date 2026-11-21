-- =====================================================================
--  Ancestral Abode: A Boutique Homestay
--  Relational schema for the booking engine (MySQL 8.0+)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS homestay_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE homestay_db;

-- ---------------------------------------------------------------------
--  rooms — the bookable inventory
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  capacity INT NOT NULL,
  total_inventory INT NOT NULL DEFAULT 1,
  amenities JSON,
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rooms_price CHECK (base_price >= 0),
  CONSTRAINT chk_rooms_capacity CHECK (capacity > 0),
  CONSTRAINT chk_rooms_inventory CHECK (total_inventory > 0),
  INDEX idx_rooms_price (base_price),
  INDEX idx_rooms_capacity (capacity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  room_gallery — additional imagery per room (card carousels)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  caption VARCHAR(160),
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_gallery_room FOREIGN KEY (room_id)
    REFERENCES rooms(id) ON DELETE CASCADE,
  INDEX idx_gallery_room (room_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  bookings — one row per reservation
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  room_id INT NOT NULL,
  guest_name VARCHAR(120) NOT NULL,
  guest_email VARCHAR(120) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests_count INT NOT NULL,
  total_nights INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  special_requests TEXT,
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_room FOREIGN KEY (room_id)
    REFERENCES rooms(id) ON DELETE RESTRICT,
  CONSTRAINT chk_bookings_dates CHECK (check_out > check_in),
  CONSTRAINT chk_bookings_nights CHECK (total_nights > 0),
  CONSTRAINT chk_bookings_amount CHECK (total_amount >= 0),
  CONSTRAINT chk_bookings_guests CHECK (guests_count > 0),
  INDEX idx_bookings_room (room_id),
  INDEX idx_bookings_dates (check_in, check_out),
  INDEX idx_bookings_status (status),
  INDEX idx_bookings_email (guest_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  booking_guests — optional per-guest details on a reservation
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS booking_guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  age_group ENUM('adult', 'child', 'infant') DEFAULT 'adult',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_guests_booking FOREIGN KEY (booking_id)
    REFERENCES bookings(id) ON DELETE CASCADE,
  INDEX idx_guests_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  concierge_requests — "Request Private Concierge Car" & contact
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS concierge_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guest_name VARCHAR(120) NOT NULL,
  guest_phone VARCHAR(20) NOT NULL,
  guest_email VARCHAR(120),
  service_type ENUM('concierge_car', 'airport_transfer', 'local_tour', 'general') DEFAULT 'general',
  destination VARCHAR(160),
  requested_date DATE,
  notes TEXT,
  status ENUM('pending', 'scheduled', 'completed', 'declined') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_concierge_status (status),
  INDEX idx_concierge_phone (guest_phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  newsletter_subscribers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  experiences — in-house experiences catalogue
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experiences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_guests INT NOT NULL DEFAULT 6,
  description VARCHAR(500),
  image_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_exp_price CHECK (price >= 0),
  INDEX idx_exp_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  sights — curated places of interest
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sights (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  distance_label VARCHAR(60) NOT NULL,
  distance_minutes INT,
  summary VARCHAR(500),
  image_url VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  INDEX idx_sights_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  reviews — verified guest reviews
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guest_name VARCHAR(120) NOT NULL,
  guest_origin VARCHAR(120),
  rating TINYINT NOT NULL DEFAULT 5,
  quote TEXT NOT NULL,
  source ENUM('direct', 'tripadvisor', 'airbnb') DEFAULT 'direct',
  source_detail VARCHAR(160),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
  INDEX idx_reviews_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  journal_posts — editorial grid
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  category ENUM('heritage', 'festival', 'restoration', 'travel') DEFAULT 'heritage',
  excerpt VARCHAR(500),
  read_minutes INT NOT NULL DEFAULT 5,
  published_at DATE NOT NULL,
  image_url VARCHAR(255),
  INDEX idx_posts_published (published_at DESC),
  INDEX idx_posts_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  enquiries — general contact & room-specific inquiries
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(20),
  room_id INT NULL,
  subject VARCHAR(160),
  message TEXT NOT NULL,
  status ENUM('new', 'responded', 'archived') DEFAULT 'new',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_enquiries_room FOREIGN KEY (room_id)
    REFERENCES rooms(id) ON DELETE SET NULL,
  INDEX idx_enquiries_status (status),
  INDEX idx_enquiries_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  admin_users — portal administration credentials
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(120) NOT NULL,
  role VARCHAR(30) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_admin_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
