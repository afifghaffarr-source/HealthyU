ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS scan_streak_current integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scan_streak_longest integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scan_date date,
  ADD COLUMN IF NOT EXISTS daily_scan_limit integer NOT NULL DEFAULT 10;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS scan_reminder_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.meal_logs
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

INSERT INTO public.achievements (id, title, description, icon, category, coin_reward, xp_reward, condition_type, condition_value, is_active)
VALUES
  ('scan_streak_7', 'Scan 7 Hari', 'Scan makanan 7 hari berturut-turut', '🔥', 'food', 50, 100, 'scan_streak', 7, true),
  ('scan_streak_30', 'Scan 30 Hari', 'Scan makanan 30 hari berturut-turut', '🏆', 'food', 200, 500, 'scan_streak', 30, true),
  ('meals_100', '100 Meal Logged', 'Catat 100 meal', '🍽️', 'food', 100, 250, 'meal_count', 100, true),
  ('meals_500', '500 Meal Logged', 'Catat 500 meal', '⭐', 'food', 500, 1000, 'meal_count', 500, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.coin_rewards (name, description, coin_cost, category, is_active)
SELECT 'Scan Bonus Harian', 'Bonus coin tiap scan makanan baru', 0, 'system', false
WHERE NOT EXISTS (SELECT 1 FROM public.coin_rewards WHERE name = 'Scan Bonus Harian');