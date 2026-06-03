
-- Weekly leaderboard cache
CREATE TABLE public.weekly_leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_leaderboard TO authenticated;
GRANT ALL ON public.weekly_leaderboard TO service_role;
ALTER TABLE public.weekly_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaderboard read all" ON public.weekly_leaderboard FOR SELECT TO authenticated USING (true);
CREATE POLICY "leaderboard self write" ON public.weekly_leaderboard FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Imported recipes from URL
CREATE TABLE public.imported_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  title TEXT,
  ingredients JSONB,
  steps JSONB,
  raw_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.imported_recipes TO authenticated;
GRANT ALL ON public.imported_recipes TO service_role;
ALTER TABLE public.imported_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imported recipes self" ON public.imported_recipes FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Grocery list from mealplan
CREATE TABLE public.grocery_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grocery_lists TO authenticated;
GRANT ALL ON public.grocery_lists TO service_role;
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grocery self" ON public.grocery_lists FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Subscription tiers (simplified, no Stripe yet)
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub self" ON public.subscriptions FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Weekly podcast (TTS script storage)
CREATE TABLE public.weekly_podcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_start DATE NOT NULL,
  script TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_podcasts TO authenticated;
GRANT ALL ON public.weekly_podcasts TO service_role;
ALTER TABLE public.weekly_podcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "podcast self" ON public.weekly_podcasts FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Workout form check (video URL + AI feedback)
CREATE TABLE public.form_check_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise TEXT NOT NULL,
  video_path TEXT,
  ai_feedback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_check_sessions TO authenticated;
GRANT ALL ON public.form_check_sessions TO service_role;
ALTER TABLE public.form_check_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "formcheck self" ON public.form_check_sessions FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
