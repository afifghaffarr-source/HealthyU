CREATE TABLE public.vitals_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  systolic INT,
  diastolic INT,
  heart_rate INT,
  glucose_mgdl NUMERIC,
  glucose_state TEXT,
  note TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vitals_logs TO authenticated;
GRANT ALL ON public.vitals_logs TO service_role;

ALTER TABLE public.vitals_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own vitals all"
ON public.vitals_logs
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_vitals_logs_user_date ON public.vitals_logs(user_id, logged_at DESC);