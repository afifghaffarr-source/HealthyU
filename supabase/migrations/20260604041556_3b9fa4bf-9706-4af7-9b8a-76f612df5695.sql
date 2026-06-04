-- Content categories
CREATE TABLE public.content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_id text NOT NULL,
  name_en text,
  description text,
  parent_slug text REFERENCES public.content_categories(slug) ON DELETE SET NULL,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_categories_parent_idx ON public.content_categories(parent_slug, sort_order);

GRANT SELECT ON public.content_categories TO anon, authenticated;
GRANT ALL ON public.content_categories TO service_role;
ALTER TABLE public.content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories public read"
  ON public.content_categories FOR SELECT
  TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admin manage categories"
  ON public.content_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER content_categories_updated_at
BEFORE UPDATE ON public.content_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Content tags
CREATE TABLE public.content_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_id text NOT NULL,
  name_en text,
  usage_count int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_tags_usage_idx ON public.content_tags(usage_count DESC);

GRANT SELECT ON public.content_tags TO anon, authenticated;
GRANT ALL ON public.content_tags TO service_role;
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags public read"
  ON public.content_tags FOR SELECT
  TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admin manage tags"
  ON public.content_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Articles: seed-tracking columns
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS body_source text NOT NULL DEFAULT 'manual'
    CHECK (body_source IN ('manual','seed','ai_generated')),
  ADD COLUMN IF NOT EXISTS body_generated_at timestamptz;

CREATE INDEX IF NOT EXISTS articles_published_idx
  ON public.articles(is_published, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS articles_slug_idx ON public.articles(slug);
CREATE INDEX IF NOT EXISTS articles_category_idx ON public.articles(category, is_published);

-- Recipes: cooking time columns
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS cook_min int,
  ADD COLUMN IF NOT EXISTS total_min int;

CREATE INDEX IF NOT EXISTS recipes_published_idx
  ON public.recipes(is_published, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS recipes_slug_idx ON public.recipes(slug);