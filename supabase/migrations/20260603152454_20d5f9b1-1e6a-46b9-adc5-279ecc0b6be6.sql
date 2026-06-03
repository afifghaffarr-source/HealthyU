
-- Recipe bookmark trigger: denormalize count to recipes.save_count
CREATE OR REPLACE FUNCTION public.sync_recipe_save_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.recipes SET save_count = save_count + 1 WHERE id = NEW.recipe_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.recipes SET save_count = GREATEST(save_count - 1, 0) WHERE id = OLD.recipe_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recipe_bookmarks_count_ins ON public.recipe_bookmarks;
DROP TRIGGER IF EXISTS trg_recipe_bookmarks_count_del ON public.recipe_bookmarks;
CREATE TRIGGER trg_recipe_bookmarks_count_ins AFTER INSERT ON public.recipe_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.sync_recipe_save_count();
CREATE TRIGGER trg_recipe_bookmarks_count_del AFTER DELETE ON public.recipe_bookmarks
  FOR EACH ROW EXECUTE FUNCTION public.sync_recipe_save_count();

-- Backfill
UPDATE public.recipes r SET save_count = COALESCE(sub.c, 0)
FROM (
  SELECT recipe_id, COUNT(*)::int AS c FROM public.recipe_bookmarks GROUP BY recipe_id
) sub
WHERE r.id = sub.recipe_id;

-- Group challenges (link friend_groups to challenges)
CREATE TABLE public.group_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  challenge_id uuid NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, challenge_id)
);

GRANT SELECT, INSERT, DELETE ON public.group_challenges TO authenticated;
GRANT ALL ON public.group_challenges TO service_role;

ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group members read group_challenges"
  ON public.group_challenges FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "group members insert group_challenges"
  ON public.group_challenges FOR INSERT TO authenticated
  WITH CHECK (public.is_group_member(group_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "creator delete group_challenges"
  ON public.group_challenges FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX idx_group_challenges_challenge ON public.group_challenges(challenge_id);
CREATE INDEX idx_group_challenges_group ON public.group_challenges(group_id);
