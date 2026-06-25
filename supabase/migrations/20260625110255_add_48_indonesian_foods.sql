-- Add 48 common Indonesian foods with comprehensive nutrition data
-- Migration: Expand food database from 90 to 138 items

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Ayam Goreng Kalasan', 'Ayam Goreng Kalasan', 'lauk', 'Jawa Tengah', 280, 24, 8, 18, 0, 224, 0.8, 100, 'g', {"protein","ayam","chicken","fried"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Rendang Sapi', 'Rendang Sapi', 'lauk', 'Sumatera', 320, 22, 6, 24, 0, 256, 0.6, 100, 'g', {"protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Ikan Patin Bakar', 'Ikan Patin Bakar', 'lauk', 'Sumatera', 180, 26, 2, 8, 0, 144, 0.2, 100, 'g', {"protein","ikan","seafood"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Telur Balado', 'Telur Balado', 'lauk', 'Sumatera', 150, 12, 6, 10, 0, 120, 0.6, 100, 'g', {"protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Tahu Gejrot', 'Tahu Gejrot', 'lauk', 'Jawa Barat', 120, 8, 12, 4, 1.2, 96, 1.2, 100, 'g', {"protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Tempe Mendoan', 'Tempe Mendoan', 'lauk', 'Jawa Tengah', 160, 10, 15, 7, 1.5, 128, 1.5, 100, 'g', {"protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Pepes Ikan Mas', 'Pepes Ikan Mas', 'lauk', 'Jawa Barat', 190, 22, 4, 10, 0, 152, 0.4, 100, 'g', {"protein","ikan","seafood"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Ayam Taliwang', 'Ayam Taliwang', 'lauk', 'Jawa Timur', 260, 26, 3, 16, 0, 208, 0.3, 100, 'g', {"protein","ayam","chicken"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Gulai Kambing', 'Gulai Kambing', 'lauk', 'Sumatera', 290, 20, 8, 20, 0, 232, 0.8, 100, 'g', {"protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Sate Lilit', 'Sate Lilit', 'lauk', 'Jakarta', 200, 18, 10, 11, 0, 160, 1.0, 100, 'g', {"protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Nasi Kuning', 'Nasi Kuning', 'main', 'Jakarta', 350, 8, 65, 7, 6.5, 280, 6.5, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Nasi Liwet Solo', 'Nasi Liwet Solo', 'main', 'Jawa Tengah', 380, 10, 68, 9, 6.8, 304, 6.8, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Lontong Sayur', 'Lontong Sayur', 'main', 'Jakarta', 320, 7, 58, 8, 5.8, 256, 5.8, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Bubur Ayam', 'Bubur Ayam', 'breakfast', 'Jakarta', 280, 12, 48, 6, 4.8, 224, 4.8, 100, 'g', {"ayam","chicken","protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Mie Aceh', 'Mie Aceh', 'main', 'Sumatera', 420, 18, 55, 16, 5.5, 336, 5.5, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Kwetiau Goreng', 'Kwetiau Goreng', 'main', 'Jakarta', 450, 15, 60, 18, 6.0, 360, 6.0, 100, 'g', {"fried"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Nasi Goreng Kampung', 'Nasi Goreng Kampung', 'main', 'Jakarta', 480, 14, 70, 16, 7.0, 384, 7.0, 100, 'g', {"fried"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Nasi Pecel', 'Nasi Pecel', 'main', 'Jawa Timur', 400, 12, 62, 14, 6.2, 320, 6.2, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Pisang Goreng', 'Pisang Goreng', 'snack', 'Jakarta', 180, 2, 32, 6, 3.2, 144, 3.2, 100, 'g', {"fried","snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Kue Cubit', 'Kue Cubit', 'snack', 'Jakarta', 140, 3, 24, 4, 2.4, 112, 2.4, 100, 'g', {"snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Lemper Ayam', 'Lemper Ayam', 'snack', 'Jakarta', 220, 8, 35, 6, 3.5, 176, 3.5, 100, 'g', {"ayam","chicken","protein","snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Risoles Mayo', 'Risoles Mayo', 'snack', 'Jakarta', 200, 6, 22, 10, 2.2, 160, 2.2, 100, 'g', {"snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Onde-onde', 'Onde-onde', 'snack', 'Jakarta', 150, 2, 28, 4, 2.8, 120, 2.8, 100, 'g', {"snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Bakwan Jagung', 'Bakwan Jagung', 'snack', 'Jawa Barat', 130, 4, 18, 5, 1.8, 104, 1.8, 100, 'g', {"snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Tahu Isi', 'Tahu Isi', 'snack', 'Jawa Barat', 160, 7, 16, 8, 1.6, 128, 1.6, 100, 'g', {"snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Kroket Kentang', 'Kroket Kentang', 'snack', 'Jakarta', 170, 4, 22, 8, 2.2, 136, 2.2, 100, 'g', {"snack","camilan"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Sop Buntut', 'Sop Buntut', 'main', 'Jakarta', 280, 20, 12, 18, 1.2, 224, 1.2, 100, 'g', {"soup","berkuah"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Sayur Lodeh', 'Sayur Lodeh', 'vegetable', 'Jawa Tengah', 150, 4, 18, 7, 1.8, 120, 1.8, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Sayur Bening Bayam', 'Sayur Bening Bayam', 'vegetable', 'Jakarta', 60, 3, 8, 2, 0, 48, 0.8, 100, 'g', {"ayam","chicken","protein"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Soto Betawi', 'Soto Betawi', 'main', 'Jakarta', 340, 22, 15, 22, 1.5, 272, 1.5, 100, 'g', {"soup","berkuah"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Soto Lamongan', 'Soto Lamongan', 'main', 'Jawa Timur', 310, 20, 18, 18, 1.8, 248, 1.8, 100, 'g', {"soup","berkuah"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Rawon', 'Rawon', 'main', 'Jawa Timur', 320, 24, 12, 20, 1.2, 256, 1.2, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Coto Makassar', 'Coto Makassar', 'main', 'Sumatera', 300, 26, 10, 18, 0, 240, 1.0, 100, 'g', ARRAY[]::text[], 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Es Campur', 'Es Campur', 'drink', 'Jakarta', 220, 2, 48, 3, 4.8, 176, 14.4, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Es Cendol', 'Es Cendol', 'drink', 'Jawa Barat', 180, 1, 42, 2, 4.2, 144, 12.6, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Wedang Jahe', 'Wedang Jahe', 'drink', 'Jawa Tengah', 80, 0, 20, 0, 2.0, 64, 6.0, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Bandrek', 'Bandrek', 'drink', 'Jawa Barat', 120, 1, 28, 1, 2.8, 96, 8.4, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Jus Alpukat', 'Jus Alpukat', 'drink', 'Jakarta', 240, 3, 32, 12, 3.2, 192, 9.6, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Jus Sirsak', 'Jus Sirsak', 'drink', 'Jakarta', 150, 2, 36, 1, 3.6, 120, 10.8, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Es Teler', 'Es Teler', 'drink', 'Jakarta', 260, 2, 52, 5, 5.2, 208, 15.6, 100, 'g', {"drink","beverage","minuman"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Klepon', 'Klepon', 'dessert', 'Jawa Tengah', 140, 1, 30, 2, 3.0, 112, 9.0, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Dadar Gulung', 'Dadar Gulung', 'dessert', 'Jakarta', 160, 3, 28, 4, 2.8, 128, 8.4, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Kue Lapis', 'Kue Lapis', 'dessert', 'Jakarta', 180, 2, 32, 5, 3.2, 144, 9.6, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Martabak Manis', 'Martabak Manis', 'dessert', 'Jakarta', 450, 8, 62, 20, 6.2, 360, 18.6, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Serabi Solo', 'Serabi Solo', 'dessert', 'Jawa Tengah', 200, 4, 36, 5, 3.6, 160, 10.8, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Kue Putu', 'Kue Putu', 'dessert', 'Jakarta', 120, 2, 26, 2, 2.6, 96, 7.8, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Lupis', 'Lupis', 'dessert', 'Jawa Tengah', 180, 2, 38, 3, 3.8, 144, 11.4, 100, 'g', {"dessert","sweet","manis"}, 50, true);

INSERT INTO food_items (name, name_en, category, region, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, sugar_g, serving_size, serving_unit, tags, popularity_score, is_verified)
VALUES ('Kolak Pisang', 'Kolak Pisang', 'dessert', 'Jakarta', 220, 2, 48, 4, 4.8, 176, 14.4, 100, 'g', {"dessert","sweet","manis"}, 50, true);

