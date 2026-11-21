-- One-off content update for a database that already has the old seed data (22 Nov 2026).
-- Run once on the live database: mysql -u <user> -p homestay_db < content-update-2026-11-22.sql
-- Matches the website text written by the family; removes invented content.

-- Price: Double Suite is now 5,000 + tax (three-bed room stays 6,500)
UPDATE rooms SET base_price = 5000.00 WHERE slug = 'royal-jharokha-double-suite';

-- Invented guest reviews (made-up names, TripAdvisor/Airbnb labels). Only the five seeded ones.
DELETE FROM reviews WHERE guest_name IN
  ('Ananya Rao', 'James Whitfield', 'Mei-Ling Chen', 'Daniel Okonkwo', 'Sofia Almeida');

-- Invented blog post about restoring a stepwell the haveli doesn't have
DELETE FROM journal_posts WHERE slug = 'restoring-the-stepwell';

-- Experiences: cook with the family (no head chef / 1892 kitchen); no live santoor
UPDATE experiences
   SET name = 'Cook with the Family',
       description = 'Cook a home-style Rajasthani meal with the family in their kitchen, then sit down and eat it together.'
 WHERE slug = 'royal-cooking-masterclass';
UPDATE experiences
   SET description = 'Masala chai and kite-view sunsets on the rooftop terrace, looking out to Nahargarh Fort.'
 WHERE slug = 'sunset-rooftop-chai';

-- Sights: distances from the family's text
UPDATE sights SET distance_label = '1 km' WHERE slug IN ('hawa-mahal', 'artisanal-bazaars');
