CREATE TABLE public.recipe_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, recipe_id)
);

GRANT SELECT, INSERT, DELETE ON public.recipe_bookmarks TO authenticated;
GRANT ALL ON public.recipe_bookmarks TO service_role;

ALTER TABLE public.recipe_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own recipe_bookmarks all"
ON public.recipe_bookmarks
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_recipe_bookmarks_user ON public.recipe_bookmarks(user_id, created_at DESC);
