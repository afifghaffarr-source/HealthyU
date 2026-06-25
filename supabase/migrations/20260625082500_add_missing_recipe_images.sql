-- Add image URLs for 3 recipes that were missing images
-- Date: 2026-06-25
-- Images generated as placeholders with PIL

UPDATE recipes SET image_url = '/images/recipes/sayur-asem-kacang-panjang.png' 
WHERE slug = 'sayur-asem-kacang-panjang';

UPDATE recipes SET image_url = '/images/recipes/nasi-uduk-bowl-dengan-tempe-goreng-dan-sayuran.png' 
WHERE slug = 'nasi-uduk-bowl-dengan-tempe-goreng-dan-sayuran';

UPDATE recipes SET image_url = '/images/recipes/smoothie-mangga-kelapa-sehat.png' 
WHERE slug = 'smoothie-mangga-kelapa-sehat';
