ALTER TABLE public.group_challenge_bonuses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_challenge_bonuses;