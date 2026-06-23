-- Sprint 6 — Meal Plan enhancement
-- 2026-06-23
-- - meal_plans: tambah note, tags, swapped_from_id untuk swap tracking
-- - meal_plan_adherence: daily snapshot planned vs logged (ringan, dihitung on-the-fly jika perlu)
--
-- Catatan: kita tidak butuh row baru setiap hari. Stats adherence dihitung on-read
-- dari `meal_plans` (planned) + `meal_logs` (logged) + JOIN. Migration ini HANYA
-- menambah kolom & indexes untuk performa & swap tracking.

-- ===== meal_plans: tambah kolom =====
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS note text CHECK (note IS NULL OR length(note) <= 500),
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS swapped_from_id uuid REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence text
    CHECK (confidence IS NULL OR confidence IN ('low', 'medium', 'high'));

-- Index untuk query user_id + date range (sudah ada di indexes lama) + tags GIN
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date
  ON public.meal_plans (user_id, plan_date);

-- GIN index untuk tag filtering (skip — tags jarang dipakai untuk filter berat;
-- kalau perlu nanti bisa ditambah tanpa breaking). Skip biar migration ringan.

-- RLS tetap dari policy lama (user_id = auth.uid()).

-- ===== meal_plan_adherence_cache (opt-in cache, opsional) =====
-- Design: hitung adherence on-read di server fn. Cache ini TIDAK dibuat di migration
-- supaya tidak duplikat storage. Kalau nanti butuh cache (misal dashboard load cepat),
-- tambahkan tabel cache dengan TTL 6 jam.

-- ===== View helper untuk adherence (real-time, no cache) =====
-- View ini hanya untuk admin/debug. Production read path ada di server fn
-- yang menggabungkan planned + logged.
CREATE OR REPLACE VIEW public.meal_plan_with_actual AS
SELECT
  mp.id,
  mp.user_id,
  mp.plan_date,
  mp.meal_type,
  mp.food_item_id,
  mp.custom_name,
  mp.calories AS planned_calories,
  mp.planned_qty,
  COALESCE(SUM(ml.calories), 0) AS actual_calories,
  COUNT(ml.id) AS actual_logs
FROM public.meal_plans mp
LEFT JOIN public.meal_logs ml
  ON ml.user_id = mp.user_id
  AND ml.meal_type = mp.meal_type
  AND ml.logged_at::date = mp.plan_date
GROUP BY mp.id, mp.user_id, mp.plan_date, mp.meal_type, mp.food_item_id,
         mp.custom_name, mp.calories, mp.planned_qty;

-- Grant untuk authenticated
GRANT SELECT ON public.meal_plan_with_actual TO authenticated;

COMMENT ON VIEW public.meal_plan_with_actual IS
  'Joins meal_plans with meal_logs (by user+date+meal_type) to compute planned vs actual calories.';
COMMENT ON COLUMN public.meal_plans.swapped_from_id IS
  'When user swaps/regenerates a meal, points to the original plan row for audit trail.';
COMMENT ON COLUMN public.meal_plans.tags IS
  'Free-form tags: e.g. ''high-protein'', ''quick'', ''favorite''. User-editable.';
COMMENT ON COLUMN public.meal_plans.note IS
  'Per-meal note: e.g. ''alternatif: tempe'', ''bisa diganti yogurt''.';
COMMENT ON COLUMN public.meal_plans.confidence IS
  'AI confidence: ''low''/''medium''/''high''. Used to flag swaps needed for low confidence meals.';
