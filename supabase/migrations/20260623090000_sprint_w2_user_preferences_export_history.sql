-- Sprint W2: User Preferences + Export History
-- Adds unit, language, theme preferences to profiles + tracks export history

-- ============================================================================
-- Part 1: Add preference columns to profiles
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_unit TEXT DEFAULT 'metric',   -- 'metric' | 'imperial'
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'id',   -- 'id' | 'en'
  ADD COLUMN IF NOT EXISTS preferred_theme TEXT DEFAULT 'system',  -- 'light' | 'dark' | 'system'
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Jakarta';

COMMENT ON COLUMN public.profiles.preferred_unit IS 'Unit preference: metric (kg/cm) or imperial (lb/ft)';
COMMENT ON COLUMN public.profiles.preferred_language IS 'UI language: id (Indonesian) or en (English)';
COMMENT ON COLUMN public.profiles.preferred_theme IS 'Theme: light, dark, or system (follow OS)';
COMMENT ON COLUMN public.profiles.timezone IS 'IANA timezone, defaults to Asia/Jakarta';

-- ============================================================================
-- Part 2: Export history tracking (audit + user-visible)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.data_export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  format TEXT NOT NULL,                    -- 'json' | 'csv'
  status TEXT NOT NULL DEFAULT 'completed',-- 'started' | 'completed' | 'failed'
  size_bytes BIGINT,                       -- final file size
  table_count INTEGER,                     -- how many tables included
  row_count INTEGER,                       -- total rows exported
  error_message TEXT,                      -- if failed
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  ip_hash TEXT,                            -- for audit (hashed, not raw IP)
  user_agent TEXT
);

CREATE INDEX data_export_history_user_idx
  ON public.data_export_history(user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_export_history TO authenticated;
GRANT ALL ON public.data_export_history TO service_role;
ALTER TABLE public.data_export_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own export history all" ON public.data_export_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.data_export_history IS 'Track every data export (JSON/CSV) — visible to user for transparency, audited for compliance';

-- ============================================================================
-- Part 3: Account deletion log (transparency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                   -- no FK since user might be deleted
  reason TEXT,
  status TEXT NOT NULL,                    -- 'requested' | 'cancelled' | 'processed' | 'failed'
  requested_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  data_categories_deleted TEXT[],          -- for transparency
  error_message TEXT
);

CREATE INDEX account_deletion_log_user_idx
  ON public.account_deletion_log(user_id, requested_at DESC);

GRANT SELECT ON public.account_deletion_log TO authenticated;
GRANT ALL ON public.account_deletion_log TO service_role;
ALTER TABLE public.account_deletion_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deletion log read" ON public.account_deletion_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.account_deletion_log IS 'Audit log for account deletion requests — what was requested, when, and outcome. Immutable after write.';
