-- Fix recipe image URLs: correct extensions and remove broken links
-- Date: 2026-06-25

-- Fix extension mismatches (.jpg → .png)
UPDATE recipes SET image_url = '/images/recipes/nasi-uduk-sayur-asem.png' WHERE slug = 'nasi-uduk-sayur-asem';
UPDATE recipes SET image_url = '/images/recipes/sup-kacang-merah-pedas.png' WHERE slug = 'sup-kacang-merah-pedas';
UPDATE recipes SET image_url = '/images/recipes/tumis-tempe-kacang-panjang.png' WHERE slug = 'tumis-tempe-kacang-panjang';

-- Set NULL for recipes without actual image files
UPDATE recipes SET image_url = NULL WHERE slug IN (
  'sayur-asem-kacang-panjang',
  'nasi-uduk-bowl-dengan-tempe-goreng-dan-sayuran',
  'smoothie-mangga-kelapa-sehat'
);
