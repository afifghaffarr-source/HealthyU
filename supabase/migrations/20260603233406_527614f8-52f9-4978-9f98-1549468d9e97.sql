
CREATE TABLE public.achievement_showcase_order (
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  position int NOT NULL,
  PRIMARY KEY (user_id, achievement_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievement_showcase_order TO authenticated;
GRANT ALL ON public.achievement_showcase_order TO service_role;
ALTER TABLE public.achievement_showcase_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ach order" ON public.achievement_showcase_order FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "read all ach order" ON public.achievement_showcase_order FOR SELECT TO authenticated USING (true);

CREATE TABLE public.sleep_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  diary_date date NOT NULL,
  bedtime time,
  wake_time time,
  quality int CHECK (quality BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, diary_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_diary TO authenticated;
GRANT ALL ON public.sleep_diary TO service_role;
ALTER TABLE public.sleep_diary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sleep diary" ON public.sleep_diary FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.workout_timer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  total_seconds int NOT NULL,
  rounds int NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.workout_timer_sessions TO authenticated;
GRANT ALL ON public.workout_timer_sessions TO service_role;
ALTER TABLE public.workout_timer_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workout timer" ON public.workout_timer_sessions FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.charity_donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  coins_spent int NOT NULL,
  charity_name text NOT NULL,
  donated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.charity_donations TO authenticated;
GRANT ALL ON public.charity_donations TO service_role;
ALTER TABLE public.charity_donations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own charity" ON public.charity_donations FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE public.budget_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  budget_idr int NOT NULL,
  days int NOT NULL,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.budget_meal_plans TO authenticated;
GRANT ALL ON public.budget_meal_plans TO service_role;
ALTER TABLE public.budget_meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budget plan" ON public.budget_meal_plans FOR ALL USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
