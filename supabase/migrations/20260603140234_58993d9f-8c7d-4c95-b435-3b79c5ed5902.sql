
-- notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  delivery_channel TEXT DEFAULT 'push',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications all" ON public.notifications
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_read ON public.notifications(user_id, is_read, created_at DESC);

-- notification_preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  meal_breakfast_time TIME DEFAULT '07:00',
  meal_lunch_time TIME DEFAULT '12:00',
  meal_dinner_time TIME DEFAULT '19:00',
  meal_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  water_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  water_interval_min INTEGER DEFAULT 90,
  water_start_time TIME DEFAULT '07:00',
  water_end_time TIME DEFAULT '22:00',
  exercise_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  exercise_time TIME DEFAULT '17:00',
  fasting_sahur_enabled BOOLEAN NOT NULL DEFAULT false,
  fasting_iftar_enabled BOOLEAN NOT NULL DEFAULT false,
  prayer_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  prayer_minutes_before INTEGER DEFAULT 10,
  health_alert_enabled BOOLEAN NOT NULL DEFAULT true,
  weekly_report_enabled BOOLEAN NOT NULL DEFAULT true,
  weekly_report_day SMALLINT DEFAULT 0,
  social_enabled BOOLEAN NOT NULL DEFAULT true,
  achievement_enabled BOOLEAN NOT NULL DEFAULT true,
  challenge_enabled BOOLEAN NOT NULL DEFAULT true,
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  marketing_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notif_prefs all" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_np_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- prayer_times
CREATE TABLE IF NOT EXISTS public.prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_date DATE NOT NULL,
  city TEXT NOT NULL,
  province TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  imsak TIME,
  subuh TIME,
  terbit TIME,
  dhuha TIME,
  dzuhur TIME,
  ashar TIME,
  maghrib TIME,
  isya TIME,
  qibla_direction NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(prayer_date, city)
);
GRANT SELECT ON public.prayer_times TO anon, authenticated;
GRANT ALL ON public.prayer_times TO service_role;
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prayer public read" ON public.prayer_times FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_pt_date_city ON public.prayer_times(prayer_date, city);
