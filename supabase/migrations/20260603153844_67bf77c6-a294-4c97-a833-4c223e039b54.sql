
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- remove any prior versions (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule('recipes-trending-snapshot-weekly');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('weekly-ai-report-sunday');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'recipes-trending-snapshot-weekly',
  '0 0 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://project--5f80e415-275e-4eff-9d6d-e2c7cd6502e3.lovable.app/api/public/hooks/recipes-trending-snapshot',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_V61eRlU3MAkFoTsav3rfFQ_O9e_gD8h"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'weekly-ai-report-sunday',
  '0 1 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://project--5f80e415-275e-4eff-9d6d-e2c7cd6502e3.lovable.app/api/public/hooks/weekly-ai-report',
    headers := '{"Content-Type":"application/json","apikey":"sb_publishable_V61eRlU3MAkFoTsav3rfFQ_O9e_gD8h"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
