
DROP POLICY IF EXISTS "insert notif system" ON public.notifications_log;
CREATE POLICY "insert own notif" ON public.notifications_log FOR INSERT WITH CHECK (auth.uid() = user_id);
