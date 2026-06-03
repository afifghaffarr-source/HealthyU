
CREATE TABLE public.mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mood SMALLINT NOT NULL CHECK (mood BETWEEN 1 AND 5),
  note TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX mood_user_idx ON public.mood_logs (user_id, logged_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_logs TO authenticated;
GRANT ALL ON public.mood_logs TO service_role;

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own mood all" ON public.mood_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
