
CREATE TABLE public.friend_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.friend_invites TO authenticated;
GRANT ALL ON public.friend_invites TO service_role;
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own invites" ON public.friend_invites FOR ALL USING (auth.uid() = inviter_id) WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "read invite by token" ON public.friend_invites FOR SELECT TO authenticated USING (true);

CREATE TABLE public.theme_preferences (
  user_id uuid PRIMARY KEY,
  mode text NOT NULL DEFAULT 'auto' CHECK (mode IN ('auto','light','dark')),
  sunset_lat numeric,
  sunset_lon numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.theme_preferences TO authenticated;
GRANT ALL ON public.theme_preferences TO service_role;
ALTER TABLE public.theme_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own theme" ON public.theme_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.voice_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  transcript text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.voice_transcripts TO authenticated;
GRANT ALL ON public.voice_transcripts TO service_role;
ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own voice" ON public.voice_transcripts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage policies for scan-photos bucket (per-user folder)
CREATE POLICY "users read own scan photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users upload own scan photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own scan photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'scan-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
