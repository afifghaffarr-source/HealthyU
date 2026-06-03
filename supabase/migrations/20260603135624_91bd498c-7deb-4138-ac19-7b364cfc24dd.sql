
-- Migration 1: CORE & Profile extend
-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS blood_type TEXT,
  ADD COLUMN IF NOT EXISTS bmi NUMERIC,
  ADD COLUMN IF NOT EXISTS bmi_category TEXT,
  ADD COLUMN IF NOT EXISTS bmr NUMERIC,
  ADD COLUMN IF NOT EXISTS tdee NUMERIC,
  ADD COLUMN IF NOT EXISTS ideal_weight_min NUMERIC,
  ADD COLUMN IF NOT EXISTS ideal_weight_max NUMERIC,
  ADD COLUMN IF NOT EXISTS health_score INTEGER,
  ADD COLUMN IF NOT EXISTS health_age INTEGER,
  ADD COLUMN IF NOT EXISTS daily_protein_target NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_carbs_target NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_fat_target NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_fiber_target NUMERIC,
  ADD COLUMN IF NOT EXISTS daily_water_target INTEGER,
  ADD COLUMN IF NOT EXISTS daily_steps_target INTEGER DEFAULT 8000,
  ADD COLUMN IF NOT EXISTS total_xp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Jakarta',
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS location_province TEXT,
  ADD COLUMN IF NOT EXISTS location_lat NUMERIC,
  ADD COLUMN IF NOT EXISTS location_lng NUMERIC,
  ADD COLUMN IF NOT EXISTS premium_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by UUID,
  ADD COLUMN IF NOT EXISTS fcm_token TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- user_health_conditions
CREATE TABLE IF NOT EXISTS public.user_health_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  condition_name TEXT NOT NULL,
  severity TEXT,
  diagnosed_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_health_conditions TO authenticated;
GRANT ALL ON public.user_health_conditions TO service_role;
ALTER TABLE public.user_health_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_health_conditions all" ON public.user_health_conditions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_uhc_user ON public.user_health_conditions(user_id);
CREATE TRIGGER trg_uhc_updated BEFORE UPDATE ON public.user_health_conditions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_allergies (structured)
CREATE TABLE IF NOT EXISTS public.user_allergies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  allergen TEXT NOT NULL,
  severity TEXT,
  reaction TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_allergies TO authenticated;
GRANT ALL ON public.user_allergies TO service_role;
ALTER TABLE public.user_allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_allergies all" ON public.user_allergies
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_uall_user ON public.user_allergies(user_id);
CREATE TRIGGER trg_uall_updated BEFORE UPDATE ON public.user_allergies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_connected_accounts
CREATE TABLE IF NOT EXISTS public.user_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_connected_accounts TO authenticated;
GRANT ALL ON public.user_connected_accounts TO service_role;
ALTER TABLE public.user_connected_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_connected_accounts all" ON public.user_connected_accounts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_uca_user ON public.user_connected_accounts(user_id);
CREATE TRIGGER trg_uca_updated BEFORE UPDATE ON public.user_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
