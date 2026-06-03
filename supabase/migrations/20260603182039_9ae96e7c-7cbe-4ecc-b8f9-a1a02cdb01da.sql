CREATE TABLE public.food_scan_corrections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id uuid REFERENCES public.food_scans(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  original jsonb NOT NULL,
  corrected jsonb NOT NULL,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_fsc_user ON public.food_scan_corrections(user_id, created_at DESC);
GRANT SELECT, INSERT ON public.food_scan_corrections TO authenticated;
GRANT ALL ON public.food_scan_corrections TO service_role;
ALTER TABLE public.food_scan_corrections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own corrections select" ON public.food_scan_corrections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own corrections insert" ON public.food_scan_corrections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);