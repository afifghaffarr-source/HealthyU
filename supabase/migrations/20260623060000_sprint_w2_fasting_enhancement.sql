-- Sprint W2: Fasting Enhancement — Custom Modes + Streak + Ramadhan
-- Extends fasting_sessions with new columns for enhanced tracking
-- Adds streak computation via SQL view

-- ============================================================================
-- Part 1: Extend fasting_sessions table
-- ============================================================================

ALTER TABLE public.fasting_sessions
  ADD COLUMN IF NOT EXISTS eating_window_start TEXT,        -- e.g. '12:00' for 16:8
  ADD COLUMN IF NOT EXISTS eating_window_end TEXT,          -- e.g. '20:00' for 16:8
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,  -- true if user-defined duration
  ADD COLUMN IF NOT EXISTS is_ramadhan BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hydration_count INT DEFAULT 0,    -- water reminders acknowledged during fast
  ADD COLUMN IF NOT EXISTS mood_before INT,                 -- 1-5 energy level before fast
  ADD COLUMN IF NOT EXISTS mood_after INT;                  -- 1-5 energy level after fast

-- ============================================================================
-- Part 2: Fasting streaks view
-- ============================================================================
-- Counts consecutive days where user completed at least one fast

CREATE OR REPLACE VIEW public.fasting_streaks AS
WITH completed_fasts AS (
  SELECT
    user_id,
    DATE(start_time AT TIME ZONE 'Asia/Jakarta') AS fast_date,
    MAX(target_hours) AS target_hours,
    MAX(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600) AS actual_hours
  FROM public.fasting_sessions
  WHERE completed = true AND end_time IS NOT NULL
  GROUP BY user_id, DATE(start_time AT TIME ZONE 'Asia/Jakarta')
),
streak_groups AS (
  SELECT
    user_id,
    fast_date,
    fast_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY fast_date))::int AS grp
  FROM completed_fasts
)
SELECT
  user_id,
  grp,
  MIN(fast_date) AS streak_start,
  MAX(fast_date) AS streak_end,
  COUNT(*) AS streak_days
FROM streak_groups
GROUP BY user_id, grp;

-- ============================================================================
-- Part 3: Helper function to get current streak
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_fasting_streak(p_user_id UUID)
RETURNS INT AS $$
DECLARE
  v_streak INT;
  v_yesterday DATE := (CURRENT_DATE AT TIME ZONE 'Asia/Jakarta')::date - 1;
  v_today DATE := (CURRENT_DATE AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  -- Check if user fasted today or yesterday (streak still active)
  IF EXISTS (
    SELECT 1 FROM completed_fasts
    WHERE user_id = p_user_id AND fast_date = v_today
  ) THEN
    SELECT streak_days INTO v_streak
    FROM fasting_streaks
    WHERE user_id = p_user_id AND streak_end = v_today
    ORDER BY streak_days DESC
    LIMIT 1;
  ELSIF EXISTS (
    SELECT 1 FROM completed_fasts
    WHERE user_id = p_user_id AND fast_date = v_yesterday
  ) THEN
    SELECT streak_days INTO v_streak
    FROM fasting_streaks
    WHERE user_id = p_user_id AND streak_end = v_yesterday
    ORDER BY streak_days DESC
    LIMIT 1;
  ELSE
    v_streak := 0;
  END IF;

  RETURN COALESCE(v_streak, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Part 4: Statistics helper
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fasting_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'current_streak', public.get_current_fasting_streak(p_user_id),
    'total_fasts', (SELECT COUNT(*) FROM public.fasting_sessions WHERE user_id = p_user_id AND completed = true),
    'total_hours', (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0) FROM public.fasting_sessions WHERE user_id = p_user_id AND completed = true AND end_time IS NOT NULL),
    'longest_fast', (SELECT COALESCE(MAX(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0) FROM public.fasting_sessions WHERE user_id = p_user_id AND completed = true AND end_time IS NOT NULL),
    'this_week_count', (SELECT COUNT(*) FROM public.fasting_sessions WHERE user_id = p_user_id AND completed = true AND start_time >= (CURRENT_DATE - INTERVAL '7 days'))
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Part 5: Indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS fasting_sessions_completed_idx ON public.fasting_sessions(user_id, completed, start_time DESC) WHERE completed = true;
CREATE INDEX IF NOT EXISTS fasting_sessions_ramadhan_idx ON public.fasting_sessions(user_id, is_ramadhan, start_time DESC) WHERE is_ramadhan = true;

COMMENT ON COLUMN public.fasting_sessions.eating_window_start IS 'Start of eating window (HH:MM format)';
COMMENT ON COLUMN public.fasting_sessions.eating_window_end IS 'End of eating window (HH:MM format)';
COMMENT ON COLUMN public.fasting_sessions.is_custom IS 'True if user defined custom duration';
COMMENT ON COLUMN public.fasting_sessions.is_ramadhan IS 'True if this is a Ramadhan fast';
COMMENT ON COLUMN public.fasting_sessions.hydration_count IS 'Number of water reminders acknowledged during this fast';
COMMENT ON COLUMN public.fasting_sessions.mood_before IS 'Energy level before fast (1-5)';
COMMENT ON COLUMN public.fasting_sessions.mood_after IS 'Energy level after fast (1-5)';
