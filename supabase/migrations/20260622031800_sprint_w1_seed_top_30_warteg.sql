-- Sprint W1: AI Warung Mode — Seed Top 30 Warteg Essentials
-- Adds 30 common warteg/warung dishes to reach 50 total (20 existing + 30 new)
-- Source: TKPI (Tabel Komposisi Pangan Indonesia Kemenkes) + manual estimation
-- Ref: docs/features/ai-warung-mode-spec.md (PR #27)

-- ============================================================================
-- Vegetables & Soups (10 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Sayur Lodeh', 'Vegetable Coconut Soup', 'sayur', 95, 2, 8, 6, 2.5, 150, 'g', ARRAY['sayur lodeh', 'lodeh', 'vegetable coconut soup'], '1 mangkok', 'TKPI', 0.85),
('Sayur Sop', 'Vegetable Soup', 'sayur', 45, 2, 7, 1, 2, 150, 'g', ARRAY['sayur sop', 'sop sayur', 'vegetable soup'], '1 mangkok', 'TKPI', 0.85),
('Tumis Kangkung', 'Stir-Fried Water Spinach', 'sayur', 68, 3, 5, 4, 2.8, 100, 'g', ARRAY['tumis kangkung', 'kangkung', 'cah kangkung', 'water spinach'], '1 porsi', 'TKPI', 0.9),
('Capcay', 'Mixed Vegetables', 'sayur', 72, 3, 9, 3, 2.5, 150, 'g', ARRAY['capcay', 'cap cay', 'mixed vegetables'], '1 porsi', 'TKPI', 0.85),
('Oseng Tempe', 'Stir-Fried Tempeh', 'lauk', 145, 11, 8, 8, 3, 80, 'g', ARRAY['oseng tempe', 'orek tempe', 'tempe orek'], '1 porsi', 'TKPI', 0.85),
('Sayur Bayam', 'Spinach Soup', 'sayur', 38, 3, 4, 1, 2.5, 150, 'g', ARRAY['sayur bayam', 'bayam', 'spinach soup'], '1 mangkok', 'TKPI', 0.8),
('Tumis Buncis', 'Stir-Fried Green Beans', 'sayur', 52, 2, 6, 2, 2, 100, 'g', ARRAY['tumis buncis', 'buncis', 'green beans'], '1 porsi', 'TKPI', 0.8),
('Labu Siam Santan', 'Chayote in Coconut Milk', 'sayur', 88, 2, 9, 5, 2, 120, 'g', ARRAY['labu siam', 'sayur labu', 'chayote'], '1 porsi', 'TKPI', 0.75),
('Terong Balado', 'Eggplant in Chili Sauce', 'sayur', 95, 2, 8, 6, 3, 100, 'g', ARRAY['terong balado', 'terong', 'eggplant balado'], '1 porsi', 'TKPI', 0.8),
('Pepes Tahu', 'Steamed Tofu in Banana Leaf', 'lauk', 110, 8, 5, 7, 1.5, 100, 'g', ARRAY['pepes tahu', 'tahu pepes'], '1 bungkus', 'TKPI', 0.8);

-- ============================================================================
-- Eggs & Protein (5 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Telur Dadar', 'Omelette', 'lauk', 154, 10, 1, 12, 0, 60, 'g', ARRAY['telur dadar', 'dadar telur', 'omelette'], '1 potong', 'TKPI', 0.9),
('Telur Ceplok', 'Fried Egg', 'lauk', 90, 6, 0.5, 7, 0, 50, 'g', ARRAY['telur ceplok', 'telur mata sapi', 'fried egg'], '1 butir', 'TKPI', 0.9),
('Telur Balado', 'Egg in Chili Sauce', 'lauk', 125, 7, 4, 9, 0.5, 70, 'g', ARRAY['telur balado', 'balado telur'], '1 butir', 'TKPI', 0.85),
('Perkedel', 'Potato Fritters', 'pelengkap', 145, 4, 18, 6, 1.5, 70, 'g', ARRAY['perkedel', 'bergedel', 'perkedel kentang', 'potato fritters'], '1 buah', 'TKPI', 0.85),
('Tahu Isi', 'Stuffed Tofu', 'lauk', 165, 8, 12, 9, 1.8, 80, 'g', ARRAY['tahu isi', 'tahu bakso'], '1 buah', 'manual', 0.8);

-- ============================================================================
-- Chicken & Meat Variants (6 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Gulai Ayam', 'Chicken Curry', 'lauk', 198, 18, 5, 12, 0.8, 100, 'g', ARRAY['gulai ayam', 'kari ayam', 'chicken curry'], '1 potong', 'TKPI', 0.85),
('Opor Ayam', 'Chicken in Coconut Milk', 'lauk', 215, 20, 4, 14, 0.5, 100, 'g', ARRAY['opor ayam', 'chicken opor'], '1 potong', 'TKPI', 0.85),
('Ayam Suwir', 'Shredded Chicken', 'lauk', 165, 22, 2, 8, 0.3, 80, 'g', ARRAY['ayam suwir', 'suwiran ayam', 'shredded chicken'], '1 porsi', 'TKPI', 0.8),
('Sambal Goreng Ati', 'Liver in Chili Sauce', 'lauk', 142, 15, 6, 6, 1, 80, 'g', ARRAY['sambal goreng ati', 'ati ampela', 'liver'], '1 porsi', 'TKPI', 0.8),
('Dendeng Balado', 'Dried Beef in Chili Sauce', 'lauk', 285, 24, 8, 17, 1.2, 60, 'g', ARRAY['dendeng', 'dendeng balado', 'dried beef'], '1 porsi', 'TKPI', 0.8),
('Sate Kambing', 'Goat Satay', 'lauk', 245, 23, 3, 15, 0.2, 100, 'g', ARRAY['sate kambing', 'satay kambing', 'goat satay'], '5 tusuk', 'TKPI', 0.85);

-- ============================================================================
-- Fish & Seafood (4 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Ikan Goreng', 'Fried Fish', 'lauk', 185, 20, 2, 11, 0, 80, 'g', ARRAY['ikan goreng', 'fried fish'], '1 potong', 'TKPI', 0.8),
('Ikan Asin', 'Salted Fish', 'lauk', 145, 28, 0, 4, 0, 50, 'g', ARRAY['ikan asin', 'salted fish'], '1 potong', 'TKPI', 0.85),
('Cumi Goreng', 'Fried Squid', 'lauk', 168, 18, 8, 7, 0.3, 80, 'g', ARRAY['cumi goreng', 'cumi', 'fried squid'], '1 porsi', 'TKPI', 0.75),
('Udang Goreng', 'Fried Shrimp', 'lauk', 152, 19, 4, 6, 0.2, 70, 'g', ARRAY['udang goreng', 'udang', 'fried shrimp'], '1 porsi', 'TKPI', 0.8);

-- ============================================================================
-- Drinks (3 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Es Jeruk', 'Orange Juice', 'minuman', 92, 0.5, 22, 0.2, 0.3, 250, 'ml', ARRAY['es jeruk', 'jeruk', 'orange juice'], '1 gelas', 'TKPI', 0.85),
('Teh Tawar', 'Plain Tea', 'minuman', 2, 0, 0.5, 0, 0, 250, 'ml', ARRAY['teh tawar', 'teh', 'plain tea', 'tea'], '1 gelas', 'TKPI', 0.9),
('Kopi', 'Coffee', 'minuman', 62, 0.5, 14, 0.5, 0, 200, 'ml', ARRAY['kopi', 'kopi manis', 'coffee'], '1 gelas', 'TKPI', 0.85);

-- ============================================================================
-- Snacks & Sides (2 items)
-- ============================================================================

INSERT INTO public.food_items (name, name_en, category, calories, protein_g, carbs_g, fat_g, fiber_g, serving_size, serving_unit, aliases, portion_label, source, confidence_score) VALUES
('Tempe Mendoan', 'Thin Fried Tempeh', 'lauk', 195, 12, 14, 10, 2.5, 80, 'g', ARRAY['tempe mendoan', 'mendoan', 'thin tempeh'], '2 potong', 'TKPI', 0.85),
('Singkong Goreng', 'Fried Cassava', 'pelengkap', 168, 1.5, 32, 4, 2, 100, 'g', ARRAY['singkong goreng', 'singkong', 'fried cassava'], '3 potong', 'TKPI', 0.8);

-- ============================================================================
-- Summary: 30 new items added (total 50 with existing 20 seeds)
-- ============================================================================
-- Breakdown by category:
--   Sayur (vegetables): 8 items
--   Lauk (protein): 16 items
--   Minuman (drinks): 3 items
--   Pelengkap (sides): 3 items
--
-- All items have:
--   ✓ Indonesian aliases (lowercase, for fuzzy match)
--   ✓ Portion labels (human-readable serving size)
--   ✓ TKPI source attribution (or 'manual' where TKPI data unavailable)
--   ✓ Confidence scores (0.75-0.9 for fuzzy match threshold)
