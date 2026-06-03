
-- referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  referrer_reward_coins INTEGER NOT NULL DEFAULT 0,
  referred_reward_coins INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referral read" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "self referred insert" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = referred_id);

-- reward_transactions
CREATE TABLE IF NOT EXISTS public.reward_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  balance_after INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reward_transactions TO authenticated;
GRANT ALL ON public.reward_transactions TO service_role;
ALTER TABLE public.reward_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rewards read" ON public.reward_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_rt_user ON public.reward_transactions(user_id, created_at DESC);

-- coin_rewards (catalog)
CREATE TABLE IF NOT EXISTS public.coin_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT,
  partner_name TEXT,
  coin_cost INTEGER NOT NULL,
  total_stock INTEGER,
  remaining_stock INTEGER,
  monetary_value_idr INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coin_rewards TO anon, authenticated;
GRANT ALL ON public.coin_rewards TO service_role;
ALTER TABLE public.coin_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rewards public read" ON public.coin_rewards FOR SELECT USING (is_active);
CREATE TRIGGER trg_cr_updated BEFORE UPDATE ON public.coin_rewards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- coin_redemptions
CREATE TABLE IF NOT EXISTS public.coin_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.coin_rewards(id),
  coins_spent INTEGER NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_data JSONB DEFAULT '{}'::jsonb,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coin_redemptions TO authenticated;
GRANT ALL ON public.coin_redemptions TO service_role;
ALTER TABLE public.coin_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemption read" ON public.coin_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own redemption insert" ON public.coin_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- virtual_pets
CREATE TABLE IF NOT EXISTS public.virtual_pets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL DEFAULT 'cat',
  pet_avatar_url TEXT,
  health_stat SMALLINT NOT NULL DEFAULT 80 CHECK (health_stat BETWEEN 0 AND 100),
  happiness_stat SMALLINT NOT NULL DEFAULT 80 CHECK (happiness_stat BETWEEN 0 AND 100),
  energy_stat SMALLINT NOT NULL DEFAULT 80 CHECK (energy_stat BETWEEN 0 AND 100),
  hunger_stat SMALLINT NOT NULL DEFAULT 50 CHECK (hunger_stat BETWEEN 0 AND 100),
  evolution_stage SMALLINT NOT NULL DEFAULT 1 CHECK (evolution_stage BETWEEN 1 AND 5),
  evolution_points INTEGER NOT NULL DEFAULT 0,
  accessories JSONB DEFAULT '[]'::jsonb,
  last_fed_at TIMESTAMPTZ,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.virtual_pets TO authenticated;
GRANT ALL ON public.virtual_pets TO service_role;
ALTER TABLE public.virtual_pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet all" ON public.virtual_pets
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_vp_updated BEFORE UPDATE ON public.virtual_pets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- pet_interactions
CREATE TABLE IF NOT EXISTS public.pet_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.virtual_pets(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  health_boost SMALLINT DEFAULT 0,
  happiness_boost SMALLINT DEFAULT 0,
  energy_boost SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.pet_interactions TO authenticated;
GRANT ALL ON public.pet_interactions TO service_role;
ALTER TABLE public.pet_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet interactions" ON public.pet_interactions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.virtual_pets p WHERE p.id = pet_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.virtual_pets p WHERE p.id = pet_id AND p.user_id = auth.uid()));

-- search_history
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  search_type TEXT,
  filters JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER,
  clicked_result_id UUID,
  clicked_result_type TEXT,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own search all" ON public.search_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_sh_user ON public.search_history(user_id, searched_at DESC);

-- user_activity_log
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  platform TEXT,
  app_version TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.user_activity_log TO authenticated;
GRANT ALL ON public.user_activity_log TO service_role;
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity insert" ON public.user_activity_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ual_user ON public.user_activity_log(user_id, created_at DESC);

-- system_settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  value_type TEXT DEFAULT 'string',
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public settings read" ON public.system_settings FOR SELECT USING (is_public);
CREATE TRIGGER trg_ss_updated BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- app_versions
CREATE TABLE IF NOT EXISTS public.app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  version TEXT NOT NULL,
  build_number INTEGER,
  is_force_update BOOLEAN NOT NULL DEFAULT false,
  min_supported_version TEXT,
  release_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_versions TO anon, authenticated;
GRANT ALL ON public.app_versions TO service_role;
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "versions public read" ON public.app_versions FOR SELECT USING (is_active);
