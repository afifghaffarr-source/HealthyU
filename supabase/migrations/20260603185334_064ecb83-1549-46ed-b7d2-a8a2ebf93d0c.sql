ALTER TABLE public.virtual_pets ADD COLUMN IF NOT EXISTS pet_stage text NOT NULL DEFAULT 'egg';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_currency text NOT NULL DEFAULT 'IDR';

CREATE TABLE IF NOT EXISTS public.story_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), story_id uuid NOT NULL REFERENCES public.meal_stories(id) ON DELETE CASCADE, user_id uuid NOT NULL, body text NOT NULL CHECK (length(body) BETWEEN 1 AND 500), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_story_comments_story ON public.story_comments(story_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.story_comments TO authenticated;
GRANT ALL ON public.story_comments TO service_role;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story_comments read if can read story" ON public.story_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.meal_stories s WHERE s.id = story_comments.story_id AND (s.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_follows f WHERE f.follower_id = auth.uid() AND f.following_id = s.user_id))));
CREATE POLICY "story_comments insert self" ON public.story_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "story_comments delete own" ON public.story_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.story_likes (story_id uuid NOT NULL REFERENCES public.meal_stories(id) ON DELETE CASCADE, user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (story_id, user_id));
GRANT SELECT, INSERT, DELETE ON public.story_likes TO authenticated;
GRANT ALL ON public.story_likes TO service_role;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "story_likes read" ON public.story_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "story_likes self" ON public.story_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "story_likes delete self" ON public.story_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.family_plans (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, name text NOT NULL DEFAULT 'Keluarga', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.family_plan_members (plan_id uuid NOT NULL REFERENCES public.family_plans(id) ON DELETE CASCADE, user_id uuid NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (plan_id, user_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_plans TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.family_plan_members TO authenticated;
GRANT ALL ON public.family_plans TO service_role;
GRANT ALL ON public.family_plan_members TO service_role;
ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_plan_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "family_plans owner" ON public.family_plans FOR ALL TO authenticated USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.family_plan_members m WHERE m.plan_id = family_plans.id AND m.user_id = auth.uid())) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "family_members read" ON public.family_plan_members FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.family_plans p WHERE p.id = family_plan_members.plan_id AND p.owner_id = auth.uid()));
CREATE POLICY "family_members insert by owner" ON public.family_plan_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.family_plans p WHERE p.id = family_plan_members.plan_id AND p.owner_id = auth.uid()));
CREATE POLICY "family_members delete by owner_or_self" ON public.family_plan_members FOR DELETE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.family_plans p WHERE p.id = family_plan_members.plan_id AND p.owner_id = auth.uid()));