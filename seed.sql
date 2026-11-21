-- =====================================================================
--  Ancestral Abode — seed data
-- =====================================================================
USE homestay_db;

-- Rooms -----------------------------------------------------------------
INSERT INTO rooms (id, name, slug, base_price, capacity, total_inventory, amenities, image_url) VALUES
(1, 'The Royal Jharokha Double Suite', 'royal-jharokha-double-suite', 5000.00, 2, 3,
 '["Canopied King Bed","Hand-carved Sandstone Jharokha","Vaulted Arch Ceilings","Heritage Ensuite Bath","Courtyard Breakfast Included"]',
 '/assets/property/suite-royal-vault-king.jpg'),
(2, 'The Grand Colonnade Triple Chamber', 'grand-colonnade-triple-chamber', 6500.00, 3, 3,
 '["Three Handcrafted Teak Beds","Scalloped Arch Colonnade","Courtyard Garden View","Rain Shower Ensuite","Heritage Breakfast Included"]',
 '/assets/property/suite-alabaster-twin-fretwork.jpg')
ON DUPLICATE KEY UPDATE name = VALUES(name), image_url = VALUES(image_url), amenities = VALUES(amenities), base_price = VALUES(base_price), capacity = VALUES(capacity);

-- Room Gallery -----------------------------------------------------------
INSERT INTO room_gallery (room_id, image_url, caption, sort_order) VALUES
(1, '/assets/property/suite-royal-vault-king.jpg', 'Canopied king bed under heritage vaulted arch', 1),
(1, '/assets/property/suite-royal-vault-art-chairs.jpg', 'Antique seating area with original Rajasthani miniature art', 2),
(1, '/assets/property/bath-suite-arched-entry.jpg', 'Private ensuite through traditional sandstone arch', 3),
(1, '/assets/property/suite-maharani-king-niches.jpg', 'Illuminated jharokha wall niches and carved detailing', 4),
(2, '/assets/property/suite-alabaster-twin-fretwork.jpg', 'Three teak beds framed by carved jharokha lattice arches', 1),
(2, '/assets/property/suite-alabaster-twin-niches.jpg', 'Restored Rajasthani arched wall alcoves and bedside lamps', 2),
(2, '/assets/property/suite-haveli-garden-twin-view.jpg', 'Teak wardrobe, armchairs, and garden window view', 3),
(2, '/assets/property/bath-suite-modern-shower.jpg', 'Modern stone-finish bathroom with walk-in rain shower', 4)
ON DUPLICATE KEY UPDATE caption = VALUES(caption);

-- Experiences ------------------------------------------------------------
INSERT INTO experiences (name, slug, duration_minutes, price, max_guests, description, image_url) VALUES
('Blue Pottery Workshop', 'blue-pottery-workshop', 120, 2800.00, 8,
 'Paint your own hand-fired Jaipur blue tile with a master artisan from Kishangarh.',
 '/assets/images/exp-pottery.jpg'),
('Cook with the Family', 'royal-cooking-masterclass', 180, 4200.00, 6,
 'Cook a home-style Rajasthani meal with the family in their kitchen, then sit down and eat it together.',
 '/assets/images/exp-cooking.jpg'),
('Sunset Rooftop Chai', 'sunset-rooftop-chai', 60, 1200.00, 12,
 'Masala chai and kite-view sunsets on the rooftop terrace, looking out to Nahargarh Fort.',
 '/assets/images/exp-chai.jpg')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- Sights -----------------------------------------------------------------
INSERT INTO sights (name, slug, distance_label, distance_minutes, summary, image_url, sort_order) VALUES
('Amber Fort', 'amber-fort', '25 mins drive', 25,
 'The honey-coloured ramparts of the Kachwaha capital above Maota Lake.',
 '/assets/images/sight-amber.jpg', 1),
('Panna Meena Kund', 'panna-meena-kund', '15 mins drive', 15,
 'Eighteenth-century stepwell descending 64 steps into a cool subterranean chamber.',
 '/assets/images/sight-stepwell.jpg', 2),
('Hawa Mahal', 'hawa-mahal', '1 km', 10,
 'The honeycomb facade of 953 windows built for the queens to watch the procession.',
 '/assets/images/sight-hawa.jpg', 3),
('Artisanal Bazaars', 'artisanal-bazaars', '1 km', 5,
 'Block-printed indigo, lac bangles and blue pottery along Johari Bazaar.',
 '/assets/images/sight-bazaar.jpg', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name), distance_label = VALUES(distance_label);

-- Reviews ----------------------------------------------------------------
-- None seeded: only add real guest reviews (through the admin panel).

-- Journal ----------------------------------------------------------------
INSERT INTO journal_posts (title, slug, category, excerpt, read_minutes, published_at, image_url) VALUES
('Teej, Through the Lens of the Haveli', 'teej-through-the-haveli', 'festival',
 'Monsoon arrives with colour: mehndi in the courtyard, dhol at dusk, and a hundred years of the same celebration still playing out on the same steps.',
 6, '2026-08-29', '/assets/images/post-teej.jpg'),
('Where Blue Became a Signature', 'where-blue-became-a-signature', 'heritage',
 'The cobalt of Jaipur blue pottery arrives from Persia, refuses to be replicated, and settles into a form entirely its own. A short history in four kilns.',
 7, '2026-08-02', '/assets/images/post-blue.jpg')
ON DUPLICATE KEY UPDATE title = VALUES(title);
