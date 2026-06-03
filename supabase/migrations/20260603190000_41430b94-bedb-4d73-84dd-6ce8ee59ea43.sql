
CREATE TABLE public.daily_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  quote text NOT NULL,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_quotes TO authenticated, anon;
GRANT ALL ON public.daily_quotes TO service_role;
ALTER TABLE public.daily_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes readable" ON public.daily_quotes FOR SELECT USING (true);

CREATE TABLE public.nutrition_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  correct_index int NOT NULL,
  user_answer int,
  is_correct boolean,
  coins_awarded int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE ON public.nutrition_quizzes TO authenticated;
GRANT ALL ON public.nutrition_quizzes TO service_role;
ALTER TABLE public.nutrition_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quizzes" ON public.nutrition_quizzes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.pet_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slot text NOT NULL,
  emoji text,
  cost_coins int NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pet_accessories TO authenticated, anon;
GRANT ALL ON public.pet_accessories TO service_role;
ALTER TABLE public.pet_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accessories public" ON public.pet_accessories FOR SELECT USING (true);

CREATE TABLE public.user_pet_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessory_id uuid NOT NULL REFERENCES public.pet_accessories(id) ON DELETE CASCADE,
  equipped boolean NOT NULL DEFAULT false,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, accessory_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pet_accessories TO authenticated;
GRANT ALL ON public.user_pet_accessories TO service_role;
ALTER TABLE public.user_pet_accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pet accessories" ON public.user_pet_accessories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.habit_stacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_stacks TO authenticated;
GRANT ALL ON public.habit_stacks TO service_role;
ALTER TABLE public.habit_stacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own habit stacks" ON public.habit_stacks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_habit_stacks_updated BEFORE UPDATE ON public.habit_stacks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gacha_pulls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cost_coins int NOT NULL,
  reward_label text NOT NULL,
  reward_coins int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.gacha_pulls TO authenticated;
GRANT ALL ON public.gacha_pulls TO service_role;
ALTER TABLE public.gacha_pulls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pulls" ON public.gacha_pulls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own pulls" ON public.gacha_pulls FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.family_meal_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  user_id uuid NOT NULL,
  meal_name text NOT NULL,
  vote_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, user_id, vote_date, meal_name)
);
GRANT SELECT, INSERT, DELETE ON public.family_meal_votes TO authenticated;
GRANT ALL ON public.family_meal_votes TO service_role;
ALTER TABLE public.family_meal_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family votes member" ON public.family_meal_votes FOR ALL
USING (EXISTS (SELECT 1 FROM public.family_plan_members fpm WHERE fpm.plan_id = family_meal_votes.plan_id AND fpm.user_id = auth.uid()))
WITH CHECK (auth.uid() = user_id);

INSERT INTO public.pet_accessories (name, slot, emoji, cost_coins) VALUES
  ('Topi Petualang', 'hat', '🎩', 50),
  ('Kacamata Hitam', 'glasses', '🕶️', 40),
  ('Syal Hangat', 'neck', '🧣', 30),
  ('Mahkota Emas', 'hat', '👑', 200),
  ('Pita Pink', 'neck', '🎀', 25);

ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comments;
