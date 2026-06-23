-- Sprint W2: OCR Nutrition Label Storage + Table
-- Bucket for OCR label photos + table to store parsed nutrition data

-- ============================================================================
-- Part 1: Storage bucket for OCR label photos
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ocr-labels',
  'ocr-labels',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies: users can only access their own OCR photos
CREATE POLICY "users read own ocr labels" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ocr-labels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users upload own ocr labels" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ocr-labels' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own ocr labels" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ocr-labels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================================
-- Part 2: OCR nutrition labels table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ocr_nutrition_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT,                          -- path in storage bucket
  image_url TEXT,                             -- public URL if available
  raw_ocr_text TEXT,                          -- full text extracted by AI
  brand TEXT,                                 -- brand name if detected
  product_name TEXT,                          -- product name
  serving_size TEXT,                          -- e.g. "30g", "1 cup (240ml)"
  servings_per_container TEXT,                -- e.g. "2", "About 3.5"

  -- Nutrition per serving (parsed from label)
  calories NUMERIC,                           -- kcal
  total_fat_g NUMERIC,                        -- gram
  saturated_fat_g NUMERIC,
  trans_fat_g NUMERIC,
  cholesterol_mg NUMERIC,
  sodium_mg NUMERIC,
  total_carbs_g NUMERIC,
  dietary_fiber_g NUMERIC,
  total_sugars_g NUMERIC,
  added_sugars_g NUMERIC,
  protein_g NUMERIC,

  -- Vitamins & minerals (optional)
  vitamin_a_pct NUMERIC,
  vitamin_c_pct NUMERIC,
  calcium_pct NUMERIC,
  iron_pct NUMERIC,

  -- Metadata
  language TEXT DEFAULT 'id',                 -- detected language
  confidence NUMERIC DEFAULT 0,               -- 0-1 AI confidence
  processing_time_ms INTEGER,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ocr_labels_user_idx ON public.ocr_nutrition_labels(user_id, created_at DESC);
CREATE INDEX ocr_labels_brand_idx ON public.ocr_nutrition_labels(brand) WHERE brand IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_nutrition_labels TO authenticated;
GRANT ALL ON public.ocr_nutrition_labels TO service_role;
ALTER TABLE public.ocr_nutrition_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ocr labels all" ON public.ocr_nutrition_labels
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.ocr_nutrition_labels IS 'Parsed nutrition facts from OCR scans of food labels';
COMMENT ON COLUMN public.ocr_nutrition_labels.raw_ocr_text IS 'Full raw text extracted from the nutrition label image';
COMMENT ON COLUMN public.ocr_nutrition_labels.confidence IS 'AI confidence in the OCR parsing (0-1)';
