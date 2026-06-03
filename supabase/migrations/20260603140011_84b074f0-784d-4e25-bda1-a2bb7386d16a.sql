
-- water_logs
ALTER TABLE public.water_logs
  ADD COLUMN IF NOT EXISTS water_type TEXT DEFAULT 'plain',
  ADD COLUMN IF NOT EXISTS log_date DATE GENERATED ALWAYS AS ((logged_at AT TIME ZONE 'Asia/Jakarta')::date) STORED,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS idx_water_user_date ON public.water_logs(user_id, log_date);

-- mood_logs
ALTER TABLE public.mood_logs
  ADD COLUMN IF NOT EXISTS energy_level SMALLINT,
  ADD COLUMN IF NOT EXISTS stress_level SMALLINT,
  ADD COLUMN IF NOT EXISTS anxiety_level SMALLINT,
  ADD COLUMN IF NOT EXISTS mood_label TEXT,
  ADD COLUMN IF NOT EXISTS triggers JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS log_date DATE GENERATED ALWAYS AS ((logged_at AT TIME ZONE 'Asia/Jakarta')::date) STORED;
CREATE INDEX IF NOT EXISTS idx_mood_user_date ON public.mood_logs(user_id, log_date);

-- sleep_logs
ALTER TABLE public.sleep_logs
  ADD COLUMN IF NOT EXISTS bed_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wake_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS log_date DATE GENERATED ALWAYS AS ((sleep_end AT TIME ZONE 'Asia/Jakarta')::date) STORED,
  ADD COLUMN IF NOT EXISTS duration_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS quality_score SMALLINT,
  ADD COLUMN IF NOT EXISTS quality_label TEXT,
  ADD COLUMN IF NOT EXISTS time_to_sleep_min INTEGER,
  ADD COLUMN IF NOT EXISTS interruptions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deep_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS light_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS rem_hours NUMERIC,
  ADD COLUMN IF NOT EXISTS pre_sleep_activities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_sleep_user_date ON public.sleep_logs(user_id, log_date);

-- chat_sessions
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  topic TEXT,
  context_data JSONB DEFAULT '{}'::jsonb,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_sessions TO service_role;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chat_sessions all" ON public.chat_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_cs_user ON public.chat_sessions(user_id, last_message_at DESC);
CREATE TRIGGER trg_cs_updated BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- chat_messages extend
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS session_id UUID,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS audio_url TEXT,
  ADD COLUMN IF NOT EXISTS transcription TEXT,
  ADD COLUMN IF NOT EXISTS model_used TEXT,
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS processing_time_ms INTEGER,
  ADD COLUMN IF NOT EXISTS contains_disclaimer BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS safety_score NUMERIC,
  ADD COLUMN IF NOT EXISTS context_used JSONB,
  ADD COLUMN IF NOT EXISTS rag_sources JSONB,
  ADD COLUMN IF NOT EXISTS suggestions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS user_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS is_helpful BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_accurate BOOLEAN,
  ADD COLUMN IF NOT EXISTS user_feedback TEXT,
  ADD COLUMN IF NOT EXISTS was_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_cm_session ON public.chat_messages(session_id, created_at);

-- ai_reports
CREATE TABLE IF NOT EXISTS public.ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL,
  report_period_start DATE,
  report_period_end DATE,
  summary JSONB DEFAULT '{}'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  concerns JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  prediction TEXT,
  correlation_insights JSONB DEFAULT '[]'::jsonb,
  chart_data JSONB DEFAULT '{}'::jsonb,
  health_score INTEGER,
  health_score_change INTEGER,
  ai_model TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  shared_with_doctor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_reports TO authenticated;
GRANT ALL ON public.ai_reports TO service_role;
ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai_reports all" ON public.ai_reports
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ai_user ON public.ai_reports(user_id, created_at DESC);
