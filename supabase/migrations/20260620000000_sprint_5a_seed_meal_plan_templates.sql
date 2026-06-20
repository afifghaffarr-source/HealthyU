-- Sprint 5a (re-introduced 2026-06-20): seed Indonesian meal plan templates.
--
-- The `meal_plan_templates` table was created in 20260604034801 but the
-- project was recreated on 2026-06-18 and the seed data was lost. Without
-- templates, the client-side template fallback returns `{ template: null }`
-- and the user sees "Layanan AI tidak tersedia dan template kosong".
--
-- 4 templates cover the common calorie range (1500, 1800, 2200, 2500).
-- Each has 3-4 meals (breakfast, lunch, dinner, optional snack).
-- `diet_tags` and `avoid_allergens` are advisory only — they boost score
-- in the template selector but never hard-filter.

INSERT INTO public.meal_plan_templates (name, lang, target_calories, diet_tags, avoid_allergens, meals) VALUES
(
  'Seimbang 1500',
  'id',
  1500,
  ARRAY['balanced', 'low_calorie'],
  ARRAY[]::text[],
  '[
    {"meal_type": "breakfast", "name": "Oatmeal pisang & madu", "calories": 320, "protein_g": 10, "carbs_g": 55, "fat_g": 6},
    {"meal_type": "lunch", "name": "Nasi merah, ayam panggang, tumis buncis", "calories": 520, "protein_g": 35, "carbs_g": 60, "fat_g": 12},
    {"meal_type": "snack", "name": "Yogurt plain + chia seed", "calories": 150, "protein_g": 8, "carbs_g": 18, "fat_g": 5},
    {"meal_type": "dinner", "name": "Ikan kembung bakar, sayur asem, nasi", "calories": 510, "protein_g": 32, "carbs_g": 50, "fat_g": 14}
  ]'::jsonb
),
(
  'Seimbang 1800',
  'id',
  1800,
  ARRAY['balanced'],
  ARRAY[]::text[],
  '[
    {"meal_type": "breakfast", "name": "Nasi uduk, telur rebus, tempe goreng", "calories": 420, "protein_g": 18, "carbs_g": 55, "fat_g": 14},
    {"meal_type": "lunch", "name": "Nasi putih, rendang sapi, sayur daun singkong", "calories": 620, "protein_g": 30, "carbs_g": 75, "fat_g": 18},
    {"meal_type": "dinner", "name": "Ikan tongkol balado, nasi, lalapan", "calories": 560, "protein_g": 35, "carbs_g": 65, "fat_g": 12},
    {"meal_type": "snack", "name": "Pisang & selai kacang", "calories": 200, "protein_g": 6, "carbs_g": 30, "fat_g": 8}
  ]'::jsonb
),
(
  'Aktif 2200',
  'id',
  2200,
  ARRAY['balanced', 'high_protein'],
  ARRAY[]::text[],
  '[
    {"meal_type": "breakfast", "name": "Roti gandum, telur orak-arik, keju", "calories": 480, "protein_g": 25, "carbs_g": 45, "fat_g": 18},
    {"meal_type": "lunch", "name": "Nasi, ayam bakar madu, tumis brokoli", "calories": 720, "protein_g": 42, "carbs_g": 80, "fat_g": 18},
    {"meal_type": "snack", "name": "Smoothie pisang, susu, oat", "calories": 280, "protein_g": 10, "carbs_g": 45, "fat_g": 6},
    {"meal_type": "dinner", "name": "Pasta daging sapi, saus tomat, salad", "calories": 720, "protein_g": 40, "carbs_g": 75, "fat_g": 22}
  ]'::jsonb
),
(
  'Aktif 2500',
  'id',
  2500,
  ARRAY['balanced', 'high_protein', 'high_carb'],
  ARRAY[]::text[],
  '[
    {"meal_type": "breakfast", "name": "Nasi goreng, telur, sate ayam", "calories": 620, "protein_g": 28, "carbs_g": 75, "fat_g": 20},
    {"meal_type": "lunch", "name": "Nasi padang (rendang, daun singkong, gulai tunjang)", "calories": 880, "protein_g": 45, "carbs_g": 90, "fat_g": 32},
    {"meal_type": "snack", "name": "Ketan bakar, kelapa parut", "calories": 300, "protein_g": 6, "carbs_g": 50, "fat_g": 8},
    {"meal_type": "dinner", "name": "Mie ayam, bakso, pangsit goreng", "calories": 700, "protein_g": 38, "carbs_g": 80, "fat_g": 20}
  ]'::jsonb
),
(
  'Vegetarian 1700',
  'id',
  1700,
  ARRAY['vegetarian', 'balanced'],
  ARRAY['meat', 'fish'],
  '[
    {"meal_type": "breakfast", "name": "Bubur kacang hijau, roti gandum", "calories": 380, "protein_g": 12, "carbs_g": 65, "fat_g": 6},
    {"meal_type": "lunch", "name": "Nasi, tempe orek, sayur lodeh, tahu bacem", "calories": 580, "protein_g": 22, "carbs_g": 70, "fat_g": 18},
    {"meal_type": "snack", "name": "Pisang rebus & kacang tanah", "calories": 220, "protein_g": 6, "carbs_g": 38, "fat_g": 6},
    {"meal_type": "dinner", "name": "Nasi, gado-gado, telur rebus", "calories": 520, "protein_g": 20, "carbs_g": 60, "fat_g": 18}
  ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;
