
CREATE TABLE public.daily_content_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date date NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('article','recipe','tip')),
  content_id uuid NOT NULL,
  theme text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schedule_date, content_type, position)
);

GRANT SELECT ON public.daily_content_schedule TO authenticated;
GRANT ALL ON public.daily_content_schedule TO service_role;

ALTER TABLE public.daily_content_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read daily schedule"
  ON public.daily_content_schedule FOR SELECT TO authenticated USING (true);

CREATE INDEX daily_content_schedule_date_idx
  ON public.daily_content_schedule (schedule_date DESC);
