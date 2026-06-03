
-- Story photos
CREATE TABLE public.story_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  story_id uuid,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_photos TO authenticated;
GRANT ALL ON public.story_photos TO service_role;
ALTER TABLE public.story_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own story photos" ON public.story_photos FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Recipe reviews
CREATE TABLE public.recipe_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_reviews TO authenticated;
GRANT ALL ON public.recipe_reviews TO service_role;
ALTER TABLE public.recipe_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all reviews" ON public.recipe_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own reviews" ON public.recipe_reviews FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Weight goals
CREATE TABLE public.weight_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  start_weight_kg numeric NOT NULL,
  target_weight_kg numeric NOT NULL,
  target_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_goals TO authenticated;
GRANT ALL ON public.weight_goals TO service_role;
ALTER TABLE public.weight_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weight goals" ON public.weight_goals FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Exercise library (public read)
CREATE TABLE public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  muscle_group text,
  difficulty text,
  video_url text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exercise_library TO authenticated;
GRANT ALL ON public.exercise_library TO service_role;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read exercises" ON public.exercise_library FOR SELECT TO authenticated USING (true);

-- Login bonuses
CREATE TABLE public.daily_login_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bonus_date date NOT NULL,
  coins int NOT NULL DEFAULT 5,
  streak int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, bonus_date)
);
GRANT SELECT, INSERT ON public.daily_login_bonuses TO authenticated;
GRANT ALL ON public.daily_login_bonuses TO service_role;
ALTER TABLE public.daily_login_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own login bonuses" ON public.daily_login_bonuses FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Hydration challenges
CREATE TABLE public.hydration_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  target_ml int NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hydration_challenges TO authenticated;
GRANT ALL ON public.hydration_challenges TO service_role;
ALTER TABLE public.hydration_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members hydration ch" ON public.hydration_challenges FOR SELECT USING (public.is_group_member(group_id, auth.uid()));
CREATE POLICY "creator manage hydration ch" ON public.hydration_challenges FOR ALL USING (auth.uid()=creator_id) WITH CHECK (auth.uid()=creator_id);

CREATE TABLE public.hydration_challenge_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.hydration_challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  total_ml int NOT NULL DEFAULT 0,
  UNIQUE(challenge_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hydration_challenge_members TO authenticated;
GRANT ALL ON public.hydration_challenge_members TO service_role;
ALTER TABLE public.hydration_challenge_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hyd member" ON public.hydration_challenge_members FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Smart alarms
CREATE TABLE public.smart_alarms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wake_time time NOT NULL,
  window_min int NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.smart_alarms TO authenticated;
GRANT ALL ON public.smart_alarms TO service_role;
ALTER TABLE public.smart_alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own smart alarms" ON public.smart_alarms FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Barcode cache (shared lookup)
CREATE TABLE public.barcode_cache (
  barcode text PRIMARY KEY,
  product_name text,
  brand text,
  calories_per_100g numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  allergens text[],
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.barcode_cache TO authenticated;
GRANT ALL ON public.barcode_cache TO service_role;
ALTER TABLE public.barcode_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read barcode" ON public.barcode_cache FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert barcode" ON public.barcode_cache FOR INSERT TO authenticated WITH CHECK (true);

-- Seed minimal exercise library
INSERT INTO public.exercise_library (name, category, muscle_group, difficulty, video_url, description) VALUES
('Push-up', 'strength', 'chest', 'beginner', 'https://www.youtube.com/embed/IODxDxX7oi4', 'Push-up klasik untuk dada & trisep'),
('Squat', 'strength', 'legs', 'beginner', 'https://www.youtube.com/embed/aclHkVaku9U', 'Squat bodyweight'),
('Plank', 'core', 'core', 'beginner', 'https://www.youtube.com/embed/pSHjTRCQxIw', 'Plank untuk core stability'),
('Burpee', 'cardio', 'full-body', 'intermediate', 'https://www.youtube.com/embed/dZgVxmf6jkA', 'Cardio intens'),
('Lunge', 'strength', 'legs', 'beginner', 'https://www.youtube.com/embed/QOVaHwm-Q6U', 'Lunge bergantian');
