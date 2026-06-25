-- Sync seo_recipes.image_url with recipes.image_url
-- Date: 2026-06-25
-- Root cause: /resep page loads from seo_recipes, not recipes

-- Fix .jpg → .png extension mismatches
UPDATE seo_recipes SET image_url = '/images/recipes/nasi-uduk-bowl-dengan-tempe-goreng-dan-sayuran.png' 
WHERE slug = 'nasi-uduk-bowl-dengan-tempe-goreng-dan-sayuran';

UPDATE seo_recipes SET image_url = '/images/recipes/smoothie-mangga-kelapa-sehat.png' 
WHERE slug = 'smoothie-mangga-kelapa-sehat';

UPDATE seo_recipes SET image_url = '/images/recipes/sayur-asem-kacang-panjang.png' 
WHERE slug = 'sayur-asem-kacang-panjang';

-- Add image_url for 13 recipes that have NULL
UPDATE seo_recipes SET image_url = '/images/recipes/nasi-merah-ayam-bakar-rendah-kalori.png' 
WHERE slug = 'nasi-merah-ayam-bakar-rendah-kalori';

UPDATE seo_recipes SET image_url = '/images/recipes/sup-ayam-jahe-hangat.png' 
WHERE slug = 'sup-ayam-jahe-hangat';

UPDATE seo_recipes SET image_url = '/images/recipes/oatmeal-pisang-kayu-manis.png' 
WHERE slug = 'oatmeal-pisang-kayu-manis';

UPDATE seo_recipes SET image_url = '/images/recipes/smoothie-bayam-pisang.png' 
WHERE slug = 'smoothie-bayam-pisang';

UPDATE seo_recipes SET image_url = '/images/recipes/tumis-tahu-brokoli.png' 
WHERE slug = 'tumis-tahu-brokoli';

UPDATE seo_recipes SET image_url = '/images/recipes/soto-ayam-rendah-lemak.png' 
WHERE slug = 'soto-ayam-rendah-lemak';

UPDATE seo_recipes SET image_url = '/images/recipes/telur-dadar-sayuran.png' 
WHERE slug = 'telur-dadar-sayuran';

UPDATE seo_recipes SET image_url = '/images/recipes/ikan-bakar-bumbu-rica.png' 
WHERE slug = 'ikan-bakar-bumbu-rica';

UPDATE seo_recipes SET image_url = '/images/recipes/bubur-kacang-hijau-rendah-gula.png' 
WHERE slug = 'bubur-kacang-hijau-rendah-gula';

UPDATE seo_recipes SET image_url = '/images/recipes/pepes-tahu-jamur.png' 
WHERE slug = 'pepes-tahu-jamur';

UPDATE seo_recipes SET image_url = '/images/recipes/overnight-oats-coklat.png' 
WHERE slug = 'overnight-oats-coklat';

UPDATE seo_recipes SET image_url = '/images/recipes/capcay-kuah-bening.png' 
WHERE slug = 'capcay-kuah-bening';

UPDATE seo_recipes SET image_url = '/images/recipes/puding-chia-mangga.png' 
WHERE slug = 'puding-chia-mangga';
