
-- ===== fasting_sessions extend =====
ALTER TABLE public.fasting_sessions
  ADD COLUMN IF NOT EXISTS planned_duration_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS planned_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS actual_duration_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS imsak_time TIME,
  ADD COLUMN IF NOT EXISTS iftar_time TIME,
  ADD COLUMN IF NOT EXISTS sahur_logged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS iftar_logged BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS water_intake_ml INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS energy_level_start SMALLINT,
  ADD COLUMN IF NOT EXISTS energy_level_end SMALLINT,
  ADD COLUMN IF NOT EXISTS hunger_level_avg SMALLINT,
  ADD COLUMN IF NOT EXISTS mood_during SMALLINT,
  ADD COLUMN IF NOT EXISTS break_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ===== fasting_schedules =====
CREATE TABLE IF NOT EXISTS public.fasting_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fasting_type TEXT NOT NULL,
  enabled_days JSONB DEFAULT '[]'::jsonb,
  eating_window_start TIME,
  eating_window_end TIME,
  target_duration_hours NUMERIC,
  is_ramadhan_mode BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fasting_schedules TO authenticated;
GRANT ALL ON public.fasting_schedules TO service_role;
ALTER TABLE public.fasting_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fasting_schedules all" ON public.fasting_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_fs_user ON public.fasting_schedules(user_id);
CREATE TRIGGER trg_fs_updated BEFORE UPDATE ON public.fasting_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== body_metrics =====
CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  measure_date DATE GENERATED ALWAYS AS ((measured_at AT TIME ZONE 'Asia/Jakarta')::date) STORED,
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  muscle_mass_kg NUMERIC,
  bone_mass_kg NUMERIC,
  water_pct NUMERIC,
  visceral_fat NUMERIC,
  bmi NUMERIC,
  bmi_category TEXT,
  waist_cm NUMERIC,
  hip_cm NUMERIC,
  chest_cm NUMERIC,
  bicep_left_cm NUMERIC,
  bicep_right_cm NUMERIC,
  thigh_left_cm NUMERIC,
  thigh_right_cm NUMERIC,
  neck_cm NUMERIC,
  calf_cm NUMERIC,
  blood_pressure_sys INTEGER,
  blood_pressure_dia INTEGER,
  heart_rate_bpm INTEGER,
  blood_sugar_mg_dl NUMERIC,
  blood_oxygen_pct NUMERIC,
  body_temperature_c NUMERIC,
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.body_metrics TO authenticated;
GRANT ALL ON public.body_metrics TO service_role;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own body_metrics all" ON public.body_metrics
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_bm_user_date ON public.body_metrics(user_id, measure_date DESC);
CREATE TRIGGER trg_bm_updated BEFORE UPDATE ON public.body_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
