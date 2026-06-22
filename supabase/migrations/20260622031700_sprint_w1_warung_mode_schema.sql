-- Sprint W1: AI Warung Mode — Schema Extensions
-- Extends food_items + meal_logs for Indonesian dish recognition + combo tracking
-- Ref: docs/features/ai-warung-mode-spec.md (PR #27)

-- ============================================================================
-- Part 1: Extend food_items table
-- ============================================================================

-- Add columns for alias matching + portion metadata + source attribution
ALTER TABLE public.food_items
  ADD COLUMN aliases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN portion_label TEXT,                    -- '1 piring', '1 centong', '1 potong', etc.
  ADD COLUMN source TEXT DEFAULT 'manual',          -- 'TKPI' | 'OFF' | 'USDA' | 'manual' | 'kaggle'
  ADD COLUMN source_url TEXT,
  ADD COLUMN confidence_score NUMERIC DEFAULT 0.5,  -- 0-1, used by fuzzy match
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();

-- GIN index for fast alias lookup (fuzzy match against user's scanned text)
CREATE INDEX food_items_aliases_gin_idx ON public.food_items USING gin (aliases);

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to food_items
CREATE TRIGGER food_items_updated_at
  BEFORE UPDATE ON public.food_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN public.food_items.aliases IS 'Lowercase search aliases for fuzzy match (e.g., ["nasi goreng", "nasgor", "nasi goreng spesial"])';
COMMENT ON COLUMN public.food_items.portion_label IS 'Human-readable portion size (e.g., "1 piring", "1 potong", "1 centong")';
COMMENT ON COLUMN public.food_items.source IS 'Data source attribution: TKPI (Tabel Komposisi Pangan Indonesia), OFF (Open Food Facts), USDA, manual, kaggle';
COMMENT ON COLUMN public.food_items.confidence_score IS 'Fuzzy match confidence threshold (0-1), higher = stricter match required';

-- ============================================================================
-- Part 2: Extend meal_logs table for combo tracking
-- ============================================================================

ALTER TABLE public.meal_logs
  ADD COLUMN combo_id UUID,
  ADD COLUMN combo_name TEXT,                       -- 'Paket Warteg', 'Paket Padang', etc.
  ADD COLUMN portion_adjusted BOOLEAN DEFAULT FALSE, -- user changed slider post-scan
  ADD COLUMN portion_g NUMERIC,                      -- actual portion in grams (overrides serving_qty if set)
  ADD COLUMN source TEXT DEFAULT 'manual';           -- 'manual' | 'warung_mode' | 'barcode' | 'ocr' | 'voice'

-- Partial index for combo queries (only index rows that have combo_id)
CREATE INDEX meal_logs_combo_idx ON public.meal_logs(combo_id) WHERE combo_id IS NOT NULL;

-- Index for source-based analytics (track adoption of warung_mode vs manual entry)
CREATE INDEX meal_logs_source_idx ON public.meal_logs(source);

COMMENT ON COLUMN public.meal_logs.combo_id IS 'Shared UUID linking multiple meal_logs as a combo (e.g., nasi + lauk + sayur scanned together)';
COMMENT ON COLUMN public.meal_logs.combo_name IS 'Display name for combo (e.g., "Paket Warteg", "Paket Padang")';
COMMENT ON COLUMN public.meal_logs.portion_adjusted IS 'TRUE if user manually adjusted portion slider after AI scan (tracks override rate)';
COMMENT ON COLUMN public.meal_logs.portion_g IS 'Actual portion in grams (when set, overrides serving_qty * serving_size calculation)';
COMMENT ON COLUMN public.meal_logs.source IS 'Entry source: manual (typed), warung_mode (AI scan), barcode, ocr (nutrition label), voice';

-- ============================================================================
-- Part 3: Update existing 20 seed foods with aliases + portion labels
-- ============================================================================

-- Nasi Putih (White Rice)
UPDATE public.food_items SET
  aliases = ARRAY['nasi putih', 'nasi', 'white rice'],
  portion_label = '1 piring',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Nasi Putih';

-- Nasi Goreng (Fried Rice)
UPDATE public.food_items SET
  aliases = ARRAY['nasi goreng', 'nasgor', 'nasi goreng spesial', 'fried rice'],
  portion_label = '1 piring',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Nasi Goreng';

-- Ayam Bakar (Grilled Chicken)
UPDATE public.food_items SET
  aliases = ARRAY['ayam bakar', 'ayam panggang', 'grilled chicken'],
  portion_label = '1 potong',
  source = 'TKPI',
  confidence_score = 0.85
WHERE name = 'Ayam Bakar';

-- Ayam Goreng (Fried Chicken)
UPDATE public.food_items SET
  aliases = ARRAY['ayam goreng', 'ayam', 'ayam goreng crispy', 'fried chicken'],
  portion_label = '1 potong',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Ayam Goreng';

-- Rendang Sapi (Beef Rendang)
UPDATE public.food_items SET
  aliases = ARRAY['rendang', 'rendang sapi', 'beef rendang'],
  portion_label = '1 potong',
  source = 'TKPI',
  confidence_score = 0.95
WHERE name = 'Rendang Sapi';

-- Soto Ayam (Chicken Soto)
UPDATE public.food_items SET
  aliases = ARRAY['soto ayam', 'soto', 'chicken soto'],
  portion_label = '1 mangkok',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Soto Ayam';

-- Gado-Gado
UPDATE public.food_items SET
  aliases = ARRAY['gado-gado', 'gado gado', 'gadogado'],
  portion_label = '1 porsi',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Gado-Gado';

-- Tempe Goreng (Fried Tempeh)
UPDATE public.food_items SET
  aliases = ARRAY['tempe goreng', 'tempe', 'fried tempeh'],
  portion_label = '1 potong',
  source = 'TKPI',
  confidence_score = 0.85
WHERE name = 'Tempe Goreng';

-- Tahu Goreng (Fried Tofu)
UPDATE public.food_items SET
  aliases = ARRAY['tahu goreng', 'tahu', 'fried tofu'],
  portion_label = '1 potong',
  source = 'TKPI',
  confidence_score = 0.85
WHERE name = 'Tahu Goreng';

-- Bakso (Meatball Soup)
UPDATE public.food_items SET
  aliases = ARRAY['bakso', 'baso', 'meatball soup'],
  portion_label = '1 mangkok',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Bakso';

-- Mie Ayam (Chicken Noodles)
UPDATE public.food_items SET
  aliases = ARRAY['mie ayam', 'mi ayam', 'chicken noodles'],
  portion_label = '1 mangkok',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Mie Ayam';

-- Sate Ayam (Chicken Satay)
UPDATE public.food_items SET
  aliases = ARRAY['sate ayam', 'sate', 'satay ayam', 'chicken satay'],
  portion_label = '5 tusuk',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Sate Ayam';

-- Pecel Lele (Fried Catfish)
UPDATE public.food_items SET
  aliases = ARRAY['pecel lele', 'lele goreng', 'fried catfish'],
  portion_label = '1 ekor',
  source = 'TKPI',
  confidence_score = 0.85
WHERE name = 'Pecel Lele';

-- Nasi Uduk
UPDATE public.food_items SET
  aliases = ARRAY['nasi uduk', 'uduk'],
  portion_label = '1 piring',
  source = 'TKPI',
  confidence_score = 0.9
WHERE name = 'Nasi Uduk';

-- Sambal (Chili Sauce)
UPDATE public.food_items SET
  aliases = ARRAY['sambal', 'sambal terasi', 'sambal matah', 'chili sauce'],
  portion_label = '1 sendok makan',
  source = 'TKPI',
  confidence_score = 0.7
WHERE name = 'Sambal';

-- Es Teh Manis (Sweet Iced Tea)
UPDATE public.food_items SET
  aliases = ARRAY['es teh manis', 'es teh', 'teh manis', 'sweet iced tea'],
  portion_label = '1 gelas',
  source = 'TKPI',
  confidence_score = 0.85
WHERE name = 'Es Teh Manis';

-- Pisang Goreng (Fried Banana)
UPDATE public.food_items SET
  aliases = ARRAY['pisang goreng', 'pisang', 'fried banana'],
  portion_label = '1 potong',
  source = 'TKPI',
  confidence_score = 0.8
WHERE name = 'Pisang Goreng';

-- Sayur Asem (Tamarind Vegetable Soup)
UPDATE public.food_items SET
  aliases = ARRAY['sayur asem', 'sayur asam', 'tamarind soup'],
  portion_label = '1 mangkok',
  source = 'TKPI',
  confidence_score = 0.85
WHERE name = 'Sayur Asem';

-- Ikan Bakar (Grilled Fish)
UPDATE public.food_items SET
  aliases = ARRAY['ikan bakar', 'ikan panggang', 'grilled fish'],
  portion_label = '1 ekor',
  source = 'TKPI',
  confidence_score = 0.8
WHERE name = 'Ikan Bakar';

-- Kerupuk (Crackers)
UPDATE public.food_items SET
  aliases = ARRAY['kerupuk', 'krupuk', 'crackers', 'emping'],
  portion_label = '5 keping',
  source = 'TKPI',
  confidence_score = 0.7
WHERE name = 'Kerupuk';
