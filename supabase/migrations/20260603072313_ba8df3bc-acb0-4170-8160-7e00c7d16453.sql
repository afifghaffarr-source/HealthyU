
-- User stats (XP, level, streak)
CREATE TABLE public.user_stats (
  user_id UUID PRIMARY KEY,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stats all" ON public.user_stats FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Achievements catalog (public read)
CREATE TABLE public.achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements public read" ON public.achievements FOR SELECT
  TO anon, authenticated USING (true);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own user_achievements all" ON public.user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed achievements
INSERT INTO public.achievements (id, title, description, icon, xp_reward, category) VALUES
  ('first_meal', 'Langkah Pertama', 'Catat makanan pertamamu', '🍽️', 50, 'nutrition'),
  ('hydration_hero', 'Pahlawan Hidrasi', 'Minum 2L air dalam sehari', '💧', 75, 'hydration'),
  ('first_fast', 'Puasa Pertama', 'Selesaikan sesi puasa pertama', '⏱️', 100, 'fasting'),
  ('streak_3', 'Konsisten 3 Hari', 'Aktif 3 hari berturut-turut', '🔥', 100, 'streak'),
  ('streak_7', 'Konsisten Seminggu', 'Aktif 7 hari berturut-turut', '🔥', 250, 'streak'),
  ('streak_30', 'Bulan Emas', 'Aktif 30 hari berturut-turut', '🏆', 1000, 'streak'),
  ('level_5', 'Naik Kelas', 'Capai level 5', '⭐', 200, 'progression'),
  ('level_10', 'Veteran Sehat', 'Capai level 10', '🌟', 500, 'progression');
