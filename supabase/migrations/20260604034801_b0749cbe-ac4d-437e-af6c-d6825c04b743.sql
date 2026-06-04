
CREATE TABLE IF NOT EXISTS public.daily_tips_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  tip text NOT NULL,
  lang text NOT NULL DEFAULT 'id',
  target_conditions text[] NOT NULL DEFAULT '{}',
  target_tags text[] NOT NULL DEFAULT '{}',
  min_age int,
  max_age int,
  weight int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_tips_pool TO authenticated;
GRANT ALL ON public.daily_tips_pool TO service_role;
ALTER TABLE public.daily_tips_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tips pool readable by authenticated"
  ON public.daily_tips_pool FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS daily_tips_pool_lang_cat_idx ON public.daily_tips_pool(lang, category);

CREATE TABLE IF NOT EXISTS public.meal_plan_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lang text NOT NULL DEFAULT 'id',
  target_calories int NOT NULL,
  diet_tags text[] NOT NULL DEFAULT '{}',
  avoid_allergens text[] NOT NULL DEFAULT '{}',
  meals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meal_plan_templates TO authenticated;
GRANT ALL ON public.meal_plan_templates TO service_role;
ALTER TABLE public.meal_plan_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Meal plan templates readable by authenticated"
  ON public.meal_plan_templates FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS meal_plan_templates_cal_idx ON public.meal_plan_templates(target_calories);
