ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS streak_freeze_used_at date, ADD COLUMN IF NOT EXISTS public_profile boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.user_follows (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), follower_id uuid NOT NULL, following_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (follower_id, following_id), CHECK (follower_id <> following_id));
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.user_follows(follower_id);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows readable" ON public.user_follows FOR SELECT TO authenticated USING (follower_id = auth.uid() OR following_id = auth.uid());
CREATE POLICY "follows insert self" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (follower_id = auth.uid());
CREATE POLICY "follows delete self" ON public.user_follows FOR DELETE TO authenticated USING (follower_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.meal_stories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, image_url text, caption text, meal_log_id uuid REFERENCES public.meal_logs(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'));
CREATE INDEX IF NOT EXISTS idx_stories_user ON public.meal_stories(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_active ON public.meal_stories(expires_at);
GRANT SELECT, INSERT, DELETE ON public.meal_stories TO authenticated;
GRANT ALL ON public.meal_stories TO service_role;
ALTER TABLE public.meal_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stories visible to followers" ON public.meal_stories FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_follows f WHERE f.follower_id = auth.uid() AND f.following_id = meal_stories.user_id));
CREATE POLICY "stories insert self" ON public.meal_stories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "stories delete self" ON public.meal_stories FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.ai_daily_challenges (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, challenge_date date NOT NULL DEFAULT CURRENT_DATE, title text NOT NULL, description text, goal_type text, goal_value numeric, completed boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, challenge_date));
GRANT SELECT, INSERT, UPDATE ON public.ai_daily_challenges TO authenticated;
GRANT ALL ON public.ai_daily_challenges TO service_role;
ALTER TABLE public.ai_daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai challenges" ON public.ai_daily_challenges FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

INSERT INTO public.coin_rewards (name, description, coin_cost, category, is_active) SELECT 'Streak Freeze', 'Skip 1 hari tanpa kehilangan streak scan', 30, 'food', true WHERE NOT EXISTS (SELECT 1 FROM public.coin_rewards WHERE name = 'Streak Freeze');