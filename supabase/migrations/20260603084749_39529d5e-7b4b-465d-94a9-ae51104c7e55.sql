
-- 1. Extensions for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Extend food_items with rich metadata
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS glycemic_index integer,
  ADD COLUMN IF NOT EXISTS allergens text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS data_confidence numeric(3,2) DEFAULT 0.80,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS popularity_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sodium_mg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sugar_g numeric DEFAULT 0;

-- 3. Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_food_items_name_trgm ON public.food_items USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_food_items_category ON public.food_items (category);
CREATE INDEX IF NOT EXISTS idx_food_items_region ON public.food_items (region);
CREATE INDEX IF NOT EXISTS idx_food_items_popularity ON public.food_items (popularity_score DESC);

-- 4. Serving sizes table (local Indonesian units)
CREATE TABLE IF NOT EXISTS public.food_serving_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_item_id uuid NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  label text NOT NULL,
  grams numeric NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.food_serving_sizes TO anon, authenticated;
GRANT ALL ON public.food_serving_sizes TO service_role;

ALTER TABLE public.food_serving_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "serving_sizes public read"
  ON public.food_serving_sizes FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_serving_sizes_food ON public.food_serving_sizes (food_item_id);
