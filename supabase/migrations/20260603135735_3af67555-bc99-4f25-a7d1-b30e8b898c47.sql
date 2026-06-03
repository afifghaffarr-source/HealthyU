
-- ===== food_items extend =====
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS cuisine TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS glycemic_load NUMERIC,
  ADD COLUMN IF NOT EXISTS cholesterol_mg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sat_fat_g NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trans_fat_g NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS potassium_mg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calcium_mg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iron_mg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_c_mg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_halal BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_gluten_free BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_keto_friendly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_diabetic_friendly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_rating INTEGER,
  ADD COLUMN IF NOT EXISTS common_portions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bpom_number TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS times_logged INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ml_class_id TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===== meal_logs extend =====
ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sugar_g NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sodium_mg NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mood_before SMALLINT,
  ADD COLUMN IF NOT EXISTS mood_after SMALLINT,
  ADD COLUMN IF NOT EXISTS hunger_level_before SMALLINT,
  ADD COLUMN IF NOT EXISTS hunger_level_after SMALLINT,
  ADD COLUMN IF NOT EXISTS location_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS log_date DATE GENERATED ALWAYS AS ((logged_at AT TIME ZONE 'Asia/Jakarta')::date) STORED,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, log_date);

-- ===== recipes extend =====
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS cuisine TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS estimated_cost_idr INTEGER,
  ADD COLUMN IF NOT EXISTS is_halal BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_vegetarian BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_vegan BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_keto_friendly BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiber_g NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cook_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===== meal_plans extend =====
ALTER TABLE public.meal_plans
  ADD COLUMN IF NOT EXISTS plan_name TEXT,
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS target_calories INTEGER,
  ADD COLUMN IF NOT EXISTS target_protein NUMERIC,
  ADD COLUMN IF NOT EXISTS target_carbs NUMERIC,
  ADD COLUMN IF NOT EXISTS target_fat NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_budget_idr INTEGER,
  ADD COLUMN IF NOT EXISTS diet_preference TEXT,
  ADD COLUMN IF NOT EXISTS exclude_allergens JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS meal_count_per_day SMALLINT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS fasting_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fasting_type TEXT,
  ADD COLUMN IF NOT EXISTS eating_window_start TIME,
  ADD COLUMN IF NOT EXISTS eating_window_end TIME,
  ADD COLUMN IF NOT EXISTS generated_by TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===== meal_log_items =====
CREATE TABLE IF NOT EXISTS public.meal_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id UUID NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
  food_item_id UUID,
  food_name TEXT NOT NULL,
  serving_qty NUMERIC NOT NULL DEFAULT 1,
  serving_unit TEXT,
  serving_size_g NUMERIC,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  fiber_g NUMERIC DEFAULT 0,
  sugar_g NUMERIC DEFAULT 0,
  sodium_mg NUMERIC DEFAULT 0,
  photo_url TEXT,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_log_items TO authenticated;
GRANT ALL ON public.meal_log_items TO service_role;
ALTER TABLE public.meal_log_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meal_log_items via parent" ON public.meal_log_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_logs m WHERE m.id = meal_log_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_logs m WHERE m.id = meal_log_id AND m.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_mli_meal ON public.meal_log_items(meal_log_id);
CREATE TRIGGER trg_mli_updated BEFORE UPDATE ON public.meal_log_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== food_alternatives =====
CREATE TABLE IF NOT EXISTS public.food_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL,
  alternative_food_id UUID NOT NULL,
  reason TEXT,
  similarity_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(food_id, alternative_food_id)
);
GRANT SELECT ON public.food_alternatives TO anon, authenticated;
GRANT ALL ON public.food_alternatives TO service_role;
ALTER TABLE public.food_alternatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_alternatives public read" ON public.food_alternatives FOR SELECT USING (true);

-- ===== food_scans =====
CREATE TABLE IF NOT EXISTS public.food_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT,
  detected_foods JSONB DEFAULT '[]'::jsonb,
  total_calories NUMERIC DEFAULT 0,
  total_protein NUMERIC DEFAULT 0,
  total_carbs NUMERIC DEFAULT 0,
  total_fat NUMERIC DEFAULT 0,
  model_version TEXT,
  processing_time_ms INTEGER,
  avg_confidence NUMERIC,
  was_accurate BOOLEAN,
  was_logged BOOLEAN NOT NULL DEFAULT false,
  meal_log_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_scans TO authenticated;
GRANT ALL ON public.food_scans TO service_role;
ALTER TABLE public.food_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own food_scans all" ON public.food_scans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_fs_user ON public.food_scans(user_id, created_at DESC);

-- ===== recipe_ratings =====
CREATE TABLE IF NOT EXISTS public.recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);
GRANT SELECT ON public.recipe_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ratings TO authenticated;
GRANT ALL ON public.recipe_ratings TO service_role;
ALTER TABLE public.recipe_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings public read" ON public.recipe_ratings FOR SELECT USING (true);
CREATE POLICY "own rating insert" ON public.recipe_ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rating update" ON public.recipe_ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rating delete" ON public.recipe_ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_rr_updated BEFORE UPDATE ON public.recipe_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== meal_plan_items =====
CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  planned_time TIME,
  food_item_id UUID,
  recipe_id UUID,
  food_name TEXT,
  serving_qty NUMERIC DEFAULT 1,
  serving_unit TEXT,
  calories NUMERIC DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  estimated_cost_idr INTEGER,
  is_logged BOOLEAN NOT NULL DEFAULT false,
  logged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plan_items TO authenticated;
GRANT ALL ON public.meal_plan_items TO service_role;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpi via parent" ON public.meal_plan_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.meal_plans p WHERE p.id = meal_plan_id AND p.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_mpi_plan_date ON public.meal_plan_items(meal_plan_id, plan_date);
CREATE TRIGGER trg_mpi_updated BEFORE UPDATE ON public.meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
