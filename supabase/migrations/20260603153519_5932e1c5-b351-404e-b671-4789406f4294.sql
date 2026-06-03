
-- Snapshot columns for recipes trending growth (7-day delta)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS save_count_snapshot integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS snapshot_at timestamptz;

-- Track when weekly AI report was last sent per user (avoid duplicate pushes)
CREATE TABLE IF NOT EXISTS public.weekly_report_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  report_id uuid,
  run_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.weekly_report_runs TO authenticated;
GRANT ALL ON public.weekly_report_runs TO service_role;
ALTER TABLE public.weekly_report_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own weekly_report_runs read"
  ON public.weekly_report_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS weekly_report_runs_user_idx ON public.weekly_report_runs(user_id, run_at DESC);
