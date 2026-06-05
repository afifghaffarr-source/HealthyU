-- WEEKLY GOALS
CREATE TABLE public.weekly_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  goal_text text NOT NULL CHECK (char_length(goal_text) BETWEEN 1 AND 200),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_goals TO authenticated;
GRANT ALL ON public.weekly_goals TO service_role;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weekly goals"
  ON public.weekly_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_weekly_goals_user_week ON public.weekly_goals(user_id, week_start DESC);
CREATE TRIGGER trg_weekly_goals_updated
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- STREAK FREEZES
CREATE TABLE public.streak_freezes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  used_for_date date,
  used_at timestamptz,
  source text NOT NULL DEFAULT 'weekly_bonus' CHECK (source IN ('weekly_bonus','manual','reward')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.streak_freezes TO authenticated;
GRANT ALL ON public.streak_freezes TO service_role;
ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own streak freezes"
  ON public.streak_freezes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_streak_freezes_user_unused
  ON public.streak_freezes(user_id) WHERE used_at IS NULL;