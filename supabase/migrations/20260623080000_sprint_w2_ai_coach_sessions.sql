-- Sprint W2: AI Coach Persistent Storage
-- Saves daily + evening coach sessions for cross-device sync + history

-- ============================================================================
-- Part 1: coach_sessions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session type
  kind TEXT NOT NULL DEFAULT 'morning',        -- 'morning' | 'evening' | 'on_demand'
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Coach output
  greeting TEXT,
  focus TEXT,
  summary TEXT,
  tips JSONB DEFAULT '[]'::jsonb,              -- array of strings
  warnings JSONB DEFAULT '[]'::jsonb,          -- array of strings
  action_plan JSONB DEFAULT '[]'::jsonb,       -- [{action: 'log_water', label, target_value}]

  -- Context snapshot (so we can re-render history without re-running AI)
  context_snapshot JSONB,                      -- {streak, totals_today, week_avg, mood}

  -- Metadata
  model_version TEXT,
  tokens_used INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,                      -- for morning/evening: end of day
  read_at TIMESTAMPTZ,                        -- when user actually viewed it
  archived BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active session per user per day per kind
CREATE UNIQUE INDEX coach_sessions_user_date_kind_idx
  ON public.coach_sessions(user_id, session_date, kind)
  WHERE archived = false;

-- Recent history query
CREATE INDEX coach_sessions_user_recent_idx
  ON public.coach_sessions(user_id, session_date DESC)
  WHERE archived = false;

-- Auto-expire query
CREATE INDEX coach_sessions_expires_idx
  ON public.coach_sessions(expires_at)
  WHERE expires_at IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_sessions TO authenticated;
GRANT ALL ON public.coach_sessions TO service_role;
ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own coach sessions all" ON public.coach_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.coach_sessions IS 'AI Coach daily sessions — morning greeting, evening reflection, on-demand tips';
COMMENT ON COLUMN public.coach_sessions.kind IS 'morning (pagi), evening (malam), on_demand';
COMMENT ON COLUMN public.coach_sessions.tips IS 'Actionable tips as JSON array of strings';
COMMENT ON COLUMN public.coach_sessions.action_plan IS 'Tappable actions: [{action: log_water, label, target_value}]';
COMMENT ON COLUMN public.coach_sessions.context_snapshot IS 'Snapshot of user state at generation time';

-- ============================================================================
-- Part 2: Auto-archive old sessions (>7 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.archive_old_coach_sessions()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.coach_sessions
  SET archived = true
  WHERE archived = false
    AND session_date < CURRENT_DATE - INTERVAL '7 days';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.archive_old_coach_sessions() IS 'Soft-archive coach sessions older than 7 days. Run daily via cron.';

-- ============================================================================
-- Part 3: Get-or-create helper (read-through pattern)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_today_coach_session(
  p_user_id UUID,
  p_kind TEXT
)
RETURNS public.coach_sessions AS $$
DECLARE
  v_session public.coach_sessions;
BEGIN
  SELECT * INTO v_session
  FROM public.coach_sessions
  WHERE user_id = p_user_id
    AND kind = p_kind
    AND session_date = CURRENT_DATE
    AND archived = false
  LIMIT 1;

  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_today_coach_session(UUID, TEXT) IS 'Fetch today''s active coach session for user+kind. Returns NULL if none exists.';
