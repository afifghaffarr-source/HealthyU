DO $$ BEGIN
  PERFORM cron.unschedule('recipes-trending-snapshot-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
  PERFORM cron.unschedule('weekly-ai-report-sunday');
EXCEPTION WHEN OTHERS THEN NULL; END $$;