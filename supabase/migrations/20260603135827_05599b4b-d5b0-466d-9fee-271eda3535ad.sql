
-- ===== workout_sessions extend =====
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS log_date DATE GENERATED ALWAYS AS ((performed_at AT TIME ZONE 'Asia/Jakarta')::date) STORED,
  ADD COLUMN IF NOT EXISTS total_sets INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reps INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exercises_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heart_rate_avg INTEGER,
  ADD COLUMN IF NOT EXISTS heart_rate_max INTEGER,
  ADD COLUMN IF NOT EXISTS heart_rate_min INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS perceived_exertion SMALLINT,
  ADD COLUMN IF NOT EXISTS mood_before SMALLINT,
  ADD COLUMN IF NOT EXISTS mood_after SMALLINT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS workout_plan_id UUID,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_workout_user_date ON public.workout_sessions(user_id, log_date);

-- ===== daily_steps extend =====
ALTER TABLE public.daily_steps
  ADD COLUMN IF NOT EXISTS distance_km NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS floors_climbed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calories_burned INTEGER DEFAULT 0;

-- ===== exercises (catalog) =====
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  slug TEXT UNIQUE,
  category TEXT NOT NULL,
  subcategory TEXT,
  difficulty TEXT DEFAULT 'beginner',
  image_url TEXT,
  video_url TEXT,
  description TEXT,
  instructions JSONB DEFAULT '[]'::jsonb,
  safety_tips JSONB DEFAULT '[]'::jsonb,
  duration_minutes INTEGER,
  calories_burned_per_min NUMERIC,
  met_value NUMERIC,
  primary_muscles JSONB DEFAULT '[]'::jsonb,
  secondary_muscles JSONB DEFAULT '[]'::jsonb,
  equipment JSONB DEFAULT '[]'::jsonb,
  default_sets INTEGER,
  default_reps INTEGER,
  default_duration_sec INTEGER,
  default_rest_sec INTEGER,
  easier_variation_id UUID,
  harder_variation_id UUID,
  contraindications JSONB DEFAULT '[]'::jsonb,
  calories_5min NUMERIC,
  calories_10min NUMERIC,
  calories_15min NUMERIC,
  calories_30min NUMERIC,
  times_performed INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercises TO anon, authenticated;
GRANT ALL ON public.exercises TO service_role;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises public read" ON public.exercises FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== workout_plans =====
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_name TEXT NOT NULL,
  plan_type TEXT DEFAULT 'manual',
  start_date DATE,
  end_date DATE,
  target_duration_min INTEGER,
  target_calories INTEGER,
  target_days_per_week SMALLINT,
  focus_areas JSONB DEFAULT '[]'::jsonb,
  difficulty TEXT DEFAULT 'beginner',
  workout_types JSONB DEFAULT '[]'::jsonb,
  available_equipment JSONB DEFAULT '[]'::jsonb,
  injuries JSONB DEFAULT '[]'::jsonb,
  generated_by TEXT DEFAULT 'manual',
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans TO authenticated;
GRANT ALL ON public.workout_plans TO service_role;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout_plans all" ON public.workout_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wp_user ON public.workout_plans(user_id);
CREATE TRIGGER trg_wp_updated BEFORE UPDATE ON public.workout_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== workout_plan_items =====
CREATE TABLE IF NOT EXISTS public.workout_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  plan_date DATE,
  day_of_week SMALLINT,
  exercise_id UUID,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL DEFAULT 0,
  exercise_type TEXT,
  duration_sec INTEGER,
  sets INTEGER,
  reps INTEGER,
  rest_between_sets_sec INTEGER,
  rest_after_sec INTEGER,
  weight_kg NUMERIC,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plan_items TO authenticated;
GRANT ALL ON public.workout_plan_items TO service_role;
ALTER TABLE public.workout_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wpi via parent" ON public.workout_plan_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = workout_plan_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_plans p WHERE p.id = workout_plan_id AND p.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wpi_plan ON public.workout_plan_items(workout_plan_id, plan_date);
CREATE TRIGGER trg_wpi_updated BEFORE UPDATE ON public.workout_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== workout_log_items =====
CREATE TABLE IF NOT EXISTS public.workout_log_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL DEFAULT 0,
  sets_completed INTEGER DEFAULT 0,
  reps_per_set JSONB DEFAULT '[]'::jsonb,
  duration_sec INTEGER,
  weight_kg NUMERIC,
  distance_km NUMERIC,
  calories_burned INTEGER DEFAULT 0,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_log_items TO authenticated;
GRANT ALL ON public.workout_log_items TO service_role;
ALTER TABLE public.workout_log_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wli via parent" ON public.workout_log_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workout_sessions w WHERE w.id = workout_log_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions w WHERE w.id = workout_log_id AND w.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_wli_log ON public.workout_log_items(workout_log_id);
CREATE TRIGGER trg_wli_updated BEFORE UPDATE ON public.workout_log_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
