-- Sprint W1 Part 2: AI Warung Mode — Seed 40 Regional + Restaurant Foods
-- Adds 40 items (Padang, Betawi, Sundanese, Javanese, Chinese-Indo, Street Food)
-- Total after Part 1+2: 90 Indonesian foods (50 + 40)
-- Source: TKPI (Tabel Komposisi Pangan Indonesia) + manual estimation
-- Ref: docs/features/ai-warung-mode-spec.md (PR #27 v3)

-- ============================================================================
-- Padang Cuisine (10 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Rendang Ayam', 'Chicken Rendang', 'lauk', 280, 20, 5, 20, 1.2, 100, 'g', ARRAY['rendang ayam', 'chicken rendang'], '1 potong', 'TKPI', 0.85),
('Gulai Ikan', 'Fish Curry', 'lauk', 165, 18, 6, 8, 0.8, 100, 'g', ARRAY['gulai ikan', 'fish curry'], '1 potong', 'TKPI', 0.8),
('Sate Padang', 'Padang Satay', 'lauk', 195, 22, 8, 8, 0.5, 100, 'g', ARRAY['sate padang', 'padang satay'], '5 tusuk', 'TKPI', 0.85),
('Ayam Pop', 'Padang Boiled Chicken', 'lauk', 185, 26, 2, 8, 0.2, 100, 'g', ARRAY['ayam pop', 'padang boiled chicken'], '1 potong', 'TKPI', 0.8),
('Perkedel Jagung', 'Corn Fritters', 'pelengkap', 125, 4, 18, 4, 2.5, 70, 'g', ARRAY['perkedel jagung', 'bakwan jagung', 'corn fritters'], '1 buah', 'TKPI', 0.8),
('Sambal Ijo', 'Green Chili Sauce', 'sambal', 35, 1, 5, 1.5, 1.5, 30, 'g', ARRAY['sambal ijo', 'sambal hijau', 'green chili'], '1 sendok makan', 'manual', 0.75),
('Gulai Tunjang', 'Beef Tendon Curry', 'lauk', 210, 15, 5, 15, 0.5, 100, 'g', ARRAY['gulai tunjang', 'tunjang', 'beef tendon'], '1 porsi', 'TKPI', 0.75),
('Kikil', 'Beef Skin', 'lauk', 185, 12, 3, 14, 0, 80, 'g', ARRAY['kikil', 'beef skin'], '1 porsi', 'TKPI', 0.7),
('Gulai Otak', 'Brain Curry', 'lauk', 145, 11, 4, 10, 0.3, 80, 'g', ARRAY['gulai otak', 'otak', 'brain curry'], '1 porsi', 'manual', 0.7),
('Gulai Cubadak', 'Jackfruit Curry', 'sayur', 95, 2, 12, 4, 3, 120, 'g', ARRAY['gulai cubadak', 'gulai nangka', 'jackfruit curry'], '1 porsi', 'TKPI', 0.75);

-- ============================================================================
-- Betawi Cuisine (5 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Kerak Telor', 'Betawi Rice Omelette', 'main', 245, 10, 28, 10, 1.2, 120, 'g', ARRAY['kerak telor', 'betawi omelette'], '1 porsi', 'TKPI', 0.85),
('Soto Betawi', 'Betawi Beef Soup', 'soup', 185, 14, 8, 11, 1, 250, 'ml', ARRAY['soto betawi', 'betawi soup'], '1 mangkok', 'TKPI', 0.85),
('Nasi Ulam', 'Herb Rice', 'main', 210, 4, 42, 3, 3, 150, 'g', ARRAY['nasi ulam', 'herb rice'], '1 piring', 'TKPI', 0.75),
('Semur Jengkol', 'Braised Jengkol', 'lauk', 125, 6, 12, 5, 4, 100, 'g', ARRAY['semur jengkol', 'jengkol'], '1 porsi', 'TKPI', 0.75),
('Asinan Betawi', 'Betawi Pickles', 'salad', 85, 2, 15, 2, 3, 150, 'g', ARRAY['asinan betawi', 'asinan', 'betawi pickles'], '1 porsi', 'TKPI', 0.8);

-- ============================================================================
-- Sundanese Cuisine (5 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Nasi Timbel', 'Banana Leaf Rice', 'main', 190, 3.5, 41, 1, 1.5, 150, 'g', ARRAY['nasi timbel', 'banana leaf rice'], '1 bungkus', 'TKPI', 0.85),
('Pepes Ikan', 'Steamed Fish in Banana Leaf', 'lauk', 145, 18, 3, 6, 0.8, 100, 'g', ARRAY['pepes ikan', 'steamed fish'], '1 bungkus', 'TKPI', 0.85),
('Karedok', 'Raw Vegetable Salad', 'salad', 95, 3, 12, 4, 4, 150, 'g', ARRAY['karedok', 'raw vegetable salad'], '1 porsi', 'TKPI', 0.8),
('Lotek', 'Boiled Vegetable Salad', 'salad', 115, 4, 14, 5, 3.5, 150, 'g', ARRAY['lotek', 'boiled vegetable salad'], '1 porsi', 'TKPI', 0.8),
('Oncom', 'Fermented Soybean Cake', 'lauk', 185, 13, 9, 11, 2.5, 80, 'g', ARRAY['oncom', 'fermented soybean'], '1 potong', 'TKPI', 0.75);

-- ============================================================================
-- Javanese Cuisine (5 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Gudeg', 'Young Jackfruit Stew', 'main', 145, 3, 18, 6, 3, 120, 'g', ARRAY['gudeg', 'jackfruit stew'], '1 porsi', 'TKPI', 0.85),
('Rawon', 'Black Beef Soup', 'soup', 195, 16, 8, 11, 1.5, 250, 'ml', ARRAY['rawon', 'black beef soup'], '1 mangkok', 'TKPI', 0.85),
('Pecel', 'Vegetable Salad with Peanut Sauce', 'salad', 165, 6, 16, 8, 4, 150, 'g', ARRAY['pecel', 'vegetable peanut salad'], '1 porsi', 'TKPI', 0.85),
('Tahu Tek', 'Tofu with Peanut Sauce', 'main', 185, 9, 15, 10, 2.5, 150, 'g', ARRAY['tahu tek', 'tofu peanut sauce'], '1 porsi', 'TKPI', 0.8),
('Sate Klatak', 'Lamb Satay on Skewers', 'lauk', 265, 24, 3, 17, 0.3, 100, 'g', ARRAY['sate klatak', 'lamb satay'], '5 tusuk', 'TKPI', 0.8);

-- ============================================================================
-- Chinese-Indonesian Fusion (8 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Fuyunghai', 'Egg Foo Young', 'lauk', 185, 12, 8, 12, 1, 100, 'g', ARRAY['fuyunghai', 'egg foo young'], '1 porsi', 'manual', 0.8),
('Lumpia', 'Spring Rolls', 'pelengkap', 145, 5, 18, 6, 2, 75, 'g', ARRAY['lumpia', 'spring rolls'], '2 potong', 'manual', 0.85),
('Kwetiau Goreng', 'Fried Flat Noodles', 'main', 285, 9, 42, 9, 2, 200, 'g', ARRAY['kwetiau goreng', 'kwetiau', 'fried flat noodles'], '1 piring', 'manual', 0.85),
('Bihun Goreng', 'Fried Rice Vermicelli', 'main', 245, 7, 38, 7, 1.5, 180, 'g', ARRAY['bihun goreng', 'bihun', 'fried vermicelli'], '1 piring', 'manual', 0.85),
('Pangsit Goreng', 'Fried Wontons', 'pelengkap', 165, 6, 18, 8, 1, 60, 'g', ARRAY['pangsit goreng', 'pangsit', 'fried wontons'], '5 buah', 'manual', 0.8),
('Siomay', 'Steamed Dumplings', 'main', 155, 8, 18, 5, 2, 150, 'g', ARRAY['siomay', 'steamed dumplings'], '1 porsi', 'TKPI', 0.85),
('Sapo Tahu', 'Tofu Hot Pot', 'main', 135, 9, 10, 7, 2, 200, 'g', ARRAY['sapo tahu', 'tofu hot pot'], '1 porsi', 'manual', 0.75),
('Tahu Campur', 'Mixed Tofu Soup', 'soup', 145, 8, 12, 7, 2.5, 250, 'ml', ARRAY['tahu campur', 'mixed tofu soup'], '1 mangkok', 'manual', 0.8);

-- ============================================================================
-- Street Food / Gorengan (7 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Risoles', 'Stuffed Fritters', 'pelengkap', 175, 5, 20, 8, 1.5, 80, 'g', ARRAY['risoles', 'risol', 'stuffed fritters'], '1 buah', 'manual', 0.8),
('Lemper', 'Sticky Rice with Chicken', 'pelengkap', 195, 6, 32, 5, 1.5, 80, 'g', ARRAY['lemper', 'sticky rice chicken'], '1 buah', 'manual', 0.8),
('Ote-Ote', 'Vegetable Fritters', 'pelengkap', 125, 3, 16, 5, 2.5, 60, 'g', ARRAY['ote-ote', 'ote', 'vegetable fritters'], '1 buah', 'manual', 0.75),
('Bakwan', 'Corn Fritters', 'pelengkap', 135, 4, 18, 5, 2, 70, 'g', ARRAY['bakwan', 'corn fritters', 'bala-bala'], '1 buah', 'manual', 0.8),
('Cireng', 'Tapioca Fritters', 'pelengkap', 145, 1, 28, 4, 0.5, 60, 'g', ARRAY['cireng', 'tapioca fritters'], '5 buah', 'manual', 0.8),
('Combro', 'Cassava Fritters with Coconut', 'pelengkap', 165, 2, 30, 5, 2, 75, 'g', ARRAY['combro', 'cassava fritters'], '1 buah', 'manual', 0.75),
('Tahu Gejrot', 'Fried Tofu in Sweet Sauce', 'pelengkap', 125, 7, 12, 5, 1.5, 100, 'g', ARRAY['tahu gejrot', 'fried tofu sweet sauce'], '1 porsi', 'manual', 0.75);

-- ============================================================================
-- Summary: 40 items added (total 90 with Part 1's 50)
-- ============================================================================
-- Breakdown by region:
--   Padang: 10 items (rendang ayam, gulai ikan, sate padang, ayam pop, etc.)
--   Betawi: 5 items (kerak telor, soto betawi, nasi ulam, semur jengkol, asinan)
--   Sundanese: 5 items (nasi timbel, pepes ikan, karedok, lotek, oncom)
--   Javanese: 5 items (gudeg, rawon, pecel, tahu tek, sate klatak)
--   Chinese-Indo: 8 items (fuyunghai, lumpia, kwetiau, bihun, pangsit, siomay, sapo tahu, tahu campur)
--   Street food: 7 items (risoles, lemper, ote-ote, bakwan, cireng, combro, tahu gejrot)
--
-- All items have:
--   ✓ Indonesian aliases (lowercase, for fuzzy match)
--   ✓ Portion labels (human-readable serving size)
--   ✓ TKPI or manual source attribution
--   ✓ Confidence scores (0.70-0.85 for fuzzy match threshold)
--
-- MVP Status: 90 items sufficient for initial launch
-- Future: Can expand to 150+ with Kaggle dataset in Sprint W2+
-- Next: Sprint W2 (portion templates + AI prompt upgrade + MenuImageSchema extension)
