-- Phase 1: timezone-aware notifications + remove insecure cron jobs

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Jakarta';

-- Drop legacy cron jobs that hardcoded the publishable apikey in their headers.
-- New cron jobs should be (re-)scheduled by an operator using a CRON_SECRET
-- stored in Supabase Vault and sent via the `x-cron-secret` header.
DO $$ BEGIN
  PERFORM cron.unschedule('recipes-trending-snapshot-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('weekly-ai-report-sunday');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
