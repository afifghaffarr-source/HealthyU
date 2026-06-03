
-- achievements extend
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS badge_url TEXT,
  ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS coin_reward INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condition_type TEXT,
  ADD COLUMN IF NOT EXISTS condition_value NUMERIC,
  ADD COLUMN IF NOT EXISTS condition_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS times_unlocked INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- xp_logs
CREATE TABLE IF NOT EXISTS public.xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  source_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_logs TO authenticated;
GRANT ALL ON public.xp_logs TO service_role;
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp_logs all" ON public.xp_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_xp_user ON public.xp_logs(user_id, created_at DESC);

-- challenges
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  title_en TEXT,
  description TEXT,
  image_url TEXT,
  challenge_type TEXT NOT NULL,
  category TEXT,
  start_date DATE,
  end_date DATE,
  duration_days INTEGER,
  difficulty TEXT DEFAULT 'beginner',
  rules JSONB DEFAULT '{}'::jsonb,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  badge_url TEXT,
  max_participants INTEGER,
  current_participants INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.challenges TO anon, authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "challenges public read" ON public.challenges FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_ch_status ON public.challenges(status, start_date DESC);
CREATE TRIGGER trg_ch_updated BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- challenge_participants
CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_day INTEGER NOT NULL DEFAULT 0,
  progress_data JSONB DEFAULT '{}'::jsonb,
  streak INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  final_rank INTEGER,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  coins_earned INTEGER NOT NULL DEFAULT 0,
  rewards_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own participation rw" ON public.challenge_participants
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "view participants of joined challenges" ON public.challenge_participants
  FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cp_ch ON public.challenge_participants(challenge_id);
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- challenge_daily_logs
CREATE TABLE IF NOT EXISTS public.challenge_daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_participant_id UUID NOT NULL REFERENCES public.challenge_participants(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  day_number INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  proof_url TEXT,
  notes TEXT,
  value_logged NUMERIC,
  target_logged NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_participant_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_daily_logs TO authenticated;
GRANT ALL ON public.challenge_daily_logs TO service_role;
ALTER TABLE public.challenge_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily logs" ON public.challenge_daily_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.challenge_participants p WHERE p.id = challenge_participant_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenge_participants p WHERE p.id = challenge_participant_id AND p.user_id = auth.uid()));
