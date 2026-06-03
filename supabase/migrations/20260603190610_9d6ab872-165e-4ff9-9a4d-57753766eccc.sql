
CREATE TABLE public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications_log TO authenticated;
GRANT ALL ON public.notifications_log TO service_role;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update own notif" ON public.notifications_log FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "insert notif system" ON public.notifications_log FOR INSERT WITH CHECK (true);

CREATE TABLE public.restaurants_nearby (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  address text,
  menu jsonb DEFAULT '[]'::jsonb,
  cached_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.restaurants_nearby TO authenticated, anon;
GRANT ALL ON public.restaurants_nearby TO service_role;
ALTER TABLE public.restaurants_nearby ENABLE ROW LEVEL SECURITY;
CREATE POLICY "restaurants public" ON public.restaurants_nearby FOR SELECT USING (true);

CREATE TABLE public.currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base text NOT NULL DEFAULT 'IDR',
  quote text NOT NULL,
  rate numeric NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (base, quote)
);
GRANT SELECT ON public.currency_rates TO authenticated, anon;
GRANT ALL ON public.currency_rates TO service_role;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates public" ON public.currency_rates FOR SELECT USING (true);

CREATE TABLE public.meditation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  duration_min int NOT NULL,
  type text NOT NULL DEFAULT 'breathing',
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.meditation_sessions TO authenticated;
GRANT ALL ON public.meditation_sessions TO service_role;
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meditation" ON public.meditation_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ai_weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);
GRANT SELECT, INSERT ON public.ai_weekly_reports TO authenticated;
GRANT ALL ON public.ai_weekly_reports TO service_role;
ALTER TABLE public.ai_weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports" ON public.ai_weekly_reports FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.family_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_by uuid,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.family_invites TO authenticated;
GRANT ALL ON public.family_invites TO service_role;
ALTER TABLE public.family_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites by owner" ON public.family_invites FOR ALL 
USING (auth.uid() = created_by OR auth.uid() = used_by) 
WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.doctor_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  urgency text NOT NULL DEFAULT 'low',
  recommended_specialist text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.doctor_referrals TO authenticated;
GRANT ALL ON public.doctor_referrals TO service_role;
ALTER TABLE public.doctor_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.doctor_referrals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
