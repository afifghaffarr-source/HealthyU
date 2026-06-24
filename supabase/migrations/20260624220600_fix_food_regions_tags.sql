-- Fix: Populate region & tags for existing 90 foods
-- Post project-recreation data fix (2026-06-24)

-- Core Indonesian dishes (staples)
UPDATE public.food_items SET tags = ARRAY['nasi', 'staple', 'rice'] WHERE name = 'Nasi Putih';
UPDATE public.food_items SET tags = ARRAY['nasi', 'goreng', 'fried'] WHERE name = 'Nasi Goreng';
UPDATE public.food_items SET region = 'Jakarta', tags = ARRAY['nasi', 'uduk', 'coconut'] WHERE name = 'Nasi Uduk';
UPDATE public.food_items SET tags = ARRAY['nasi', 'kuning', 'yellow rice'] WHERE name = 'Nasi Kuning';

-- Chicken dishes
UPDATE public.food_items SET tags = ARRAY['ayam', 'chicken', 'grilled'] WHERE name = 'Ayam Bakar';
UPDATE public.food_items SET tags = ARRAY['ayam', 'chicken', 'fried'] WHERE name = 'Ayam Goreng';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['ayam', 'rendang', 'padang'] WHERE name = 'Rendang Ayam';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['ayam', 'gulai', 'curry'] WHERE name = 'Gulai Ayam';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['ayam', 'opor', 'coconut'] WHERE name = 'Opor Ayam';
UPDATE public.food_items SET tags = ARRAY['ayam', 'suwir', 'shredded'] WHERE name = 'Ayam Suwir';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['ayam', 'pop', 'padang'] WHERE name = 'Ayam Pop';

-- Beef dishes
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['sapi', 'rendang', 'beef', 'spicy'] WHERE name = 'Rendang Sapi';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['dendeng', 'balado', 'beef'] WHERE name = 'Dendeng Balado';

-- Soups
UPDATE public.food_items SET tags = ARRAY['soto', 'soup', 'chicken'] WHERE name = 'Soto Ayam';
UPDATE public.food_items SET region = 'Jakarta', tags = ARRAY['soto', 'betawi', 'beef'] WHERE name = 'Soto Betawi';
UPDATE public.food_items SET region = 'Jawa Timur', tags = ARRAY['rawon', 'soup', 'beef'] WHERE name = 'Rawon';
UPDATE public.food_items SET tags = ARRAY['bakso', 'meatball', 'soup'] WHERE name = 'Bakso';

-- Salads
UPDATE public.food_items SET tags = ARRAY['gado-gado', 'salad', 'vegetable'] WHERE name = 'Gado-Gado';
UPDATE public.food_items SET region = 'Jawa Barat', tags = ARRAY['karedok', 'salad', 'raw'] WHERE name = 'Karedok';
UPDATE public.food_items SET region = 'Jawa Barat', tags = ARRAY['lotek', 'salad', 'boiled'] WHERE name = 'Lotek';
UPDATE public.food_items SET region = 'Jawa Timur', tags = ARRAY['pecel', 'salad', 'peanut'] WHERE name = 'Pecel';
UPDATE public.food_items SET region = 'Jakarta', tags = ARRAY['asinan', 'pickles', 'salad'] WHERE name = 'Asinan Betawi';

-- Tofu & Tempeh
UPDATE public.food_items SET tags = ARRAY['tempe', 'fried', 'protein'] WHERE name = 'Tempe Goreng';
UPDATE public.food_items SET tags = ARRAY['tahu', 'tofu', 'fried'] WHERE name = 'Tahu Goreng';
UPDATE public.food_items SET tags = ARRAY['tempe', 'oseng', 'stir-fry'] WHERE name = 'Oseng Tempe';
UPDATE public.food_items SET tags = ARRAY['tahu', 'pepes', 'steamed'] WHERE name = 'Pepes Tahu';
UPDATE public.food_items SET tags = ARRAY['tahu', 'isi', 'stuffed'] WHERE name = 'Tahu Isi';
UPDATE public.food_items SET region = 'Jawa Timur', tags = ARRAY['tahu', 'tek', 'peanut'] WHERE name = 'Tahu Tek';

-- Fish & Seafood
UPDATE public.food_items SET tags = ARRAY['ikan', 'fish', 'grilled'] WHERE name = 'Ikan Bakar';
UPDATE public.food_items SET tags = ARRAY['ikan', 'fish', 'fried'] WHERE name = 'Ikan Goreng';
UPDATE public.food_items SET tags = ARRAY['ikan', 'lele', 'catfish'] WHERE name = 'Pecel Lele';
UPDATE public.food_items SET region = 'Jawa Barat', tags = ARRAY['ikan', 'pepes', 'steamed'] WHERE name = 'Pepes Ikan';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['ikan', 'gulai', 'curry'] WHERE name = 'Gulai Ikan';
UPDATE public.food_items SET tags = ARRAY['ikan', 'salted'] WHERE name = 'Ikan Asin';

-- Satay
UPDATE public.food_items SET tags = ARRAY['sate', 'satay', 'chicken'] WHERE name = 'Sate Ayam';
UPDATE public.food_items SET region = 'Sumatera', tags = ARRAY['sate', 'padang', 'beef'] WHERE name = 'Sate Padang';
UPDATE public.food_items SET tags = ARRAY['sate', 'kambing', 'goat'] WHERE name = 'Sate Kambing';
UPDATE public.food_items SET region = 'Jawa Tengah', tags = ARRAY['sate', 'klatak', 'lamb'] WHERE name = 'Sate Klatak';

-- Regional specialties
UPDATE public.food_items SET region = 'Jawa Tengah', tags = ARRAY['gudeg', 'jackfruit', 'sweet'] WHERE name = 'Gudeg';
UPDATE public.food_items SET region = 'Jakarta', tags = ARRAY['kerak telor', 'betawi', 'egg'] WHERE name = 'Kerak Telor';
UPDATE public.food_items SET region = 'Jawa Barat', tags = ARRAY['nasi timbel', 'sundanese', 'banana leaf'] WHERE name = 'Nasi Timbel';
UPDATE public.food_items SET region = 'Jawa Barat', tags = ARRAY['oncom', 'fermented', 'sundanese'] WHERE name = 'Oncom';

-- Noodles
UPDATE public.food_items SET tags = ARRAY['mie', 'noodle', 'chicken'] WHERE name = 'Mie Ayam';
UPDATE public.food_items SET tags = ARRAY['kwetiau', 'noodle', 'fried'] WHERE name = 'Kwetiau Goreng';
UPDATE public.food_items SET tags = ARRAY['bihun', 'vermicelli', 'fried'] WHERE name = 'Bihun Goreng';

-- Eggs
UPDATE public.food_items SET tags = ARRAY['telur', 'egg', 'omelette'] WHERE name = 'Telur Dadar';
UPDATE public.food_items SET tags = ARRAY['telur', 'egg', 'fried'] WHERE name = 'Telur Ceplok';
UPDATE public.food_items SET tags = ARRAY['telur', 'balado', 'spicy'] WHERE name = 'Telur Balado';

-- Vegetables
UPDATE public.food_items SET tags = ARRAY['sayur', 'lodeh', 'coconut'] WHERE name = 'Sayur Lodeh';
UPDATE public.food_items SET tags = ARRAY['sayur', 'sop', 'soup'] WHERE name = 'Sayur Sop';
UPDATE public.food_items SET tags = ARRAY['kangkung', 'water spinach', 'stir-fry'] WHERE name = 'Tumis Kangkung';
UPDATE public.food_items SET tags = ARRAY['capcay', 'vegetables', 'stir-fry'] WHERE name = 'Capcay';
UPDATE public.food_items SET tags = ARRAY['bayam', 'spinach', 'soup'] WHERE name = 'Sayur Bayam';
UPDATE public.food_items SET tags = ARRAY['buncis', 'green beans', 'stir-fry'] WHERE name = 'Tumis Buncis';
UPDATE public.food_items SET tags = ARRAY['terong', 'eggplant', 'balado'] WHERE name = 'Terong Balado';
UPDATE public.food_items SET tags = ARRAY['sayur asem', 'tamarind', 'soup'] WHERE name = 'Sayur Asem';

-- Snacks & Sides
UPDATE public.food_items SET tags = ARRAY['kerupuk', 'crackers', 'snack'] WHERE name = 'Kerupuk';
UPDATE public.food_items SET tags = ARRAY['pisang', 'banana', 'fried'] WHERE name = 'Pisang Goreng';
UPDATE public.food_items SET tags = ARRAY['perkedel', 'fritters', 'potato'] WHERE name = 'Perkedel';
UPDATE public.food_items SET tags = ARRAY['sambal', 'chili', 'condiment'] WHERE name = 'Sambal';

-- Beverages
UPDATE public.food_items SET tags = ARRAY['es teh', 'tea', 'sweet'] WHERE name = 'Es Teh Manis';

-- Chinese-Indo
UPDATE public.food_items SET tags = ARRAY['siomay', 'dumpling', 'steamed'] WHERE name = 'Siomay';
UPDATE public.food_items SET tags = ARRAY['lumpia', 'spring roll'] WHERE name = 'Lumpia';
UPDATE public.food_items SET tags = ARRAY['pangsit', 'wonton', 'fried'] WHERE name = 'Pangsit Goreng';
UPDATE public.food_items SET tags = ARRAY['fuyunghai', 'egg', 'chinese'] WHERE name = 'Fuyunghai';

-- Refresh popularity scores for facet aggregation
UPDATE public.food_items SET popularity_score = 100 WHERE name IN ('Nasi Putih', 'Nasi Goreng', 'Ayam Bakar', 'Ayam Goreng', 'Rendang Sapi');
UPDATE public.food_items SET popularity_score = 80 WHERE region IS NOT NULL AND popularity_score = 0;
UPDATE public.food_items SET popularity_score = 50 WHERE popularity_score = 0;
