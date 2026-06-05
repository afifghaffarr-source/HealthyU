# Cron Setup

Public hook endpoints under `/api/public/hooks/*` are authenticated via the
`CRON_SECRET` runtime secret (validated by `requireCronSecret`). They **do
not** accept the Supabase publishable / anon key as auth.

## 1. Make sure `CRON_SECRET` is set

Already provisioned via Lovable Cloud → Secrets. To rotate:

```bash
openssl rand -hex 32
```

Then update via Project Settings → Secrets (key: `CRON_SECRET`).

## 2. Unschedule legacy cron jobs (one-time)

The old jobs sent `apikey: <publishable_key>` and will now 401. They are
removed by the migration `2026060511XXXX_unschedule_legacy_cron_jobs.sql`.
If you ever need to re-run it manually:

```sql
select cron.unschedule('recipes-trending-snapshot-weekly');
select cron.unschedule('weekly-ai-report-sunday');
```

## 3. Schedule the new jobs

Run as an ad-hoc SQL via the Supabase DB console (never commit the secret
to a migration). Replace `__CRON_SECRET__` with the real value.

```sql
select cron.schedule(
  'recipes-trending-snapshot-weekly',
  '0 0 * * 1',
  $$
  select net.http_post(
    url := 'https://project--5f80e415-275e-4eff-9d6d-e2c7cd6502e3.lovable.app/api/public/hooks/recipes-trending-snapshot',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '__CRON_SECRET__'
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'weekly-ai-report-sunday',
  '0 1 * * 0',
  $$
  select net.http_post(
    url := 'https://project--5f80e415-275e-4eff-9d6d-e2c7cd6502e3.lovable.app/api/public/hooks/weekly-ai-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '__CRON_SECRET__'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Vault alternative (recommended for production)

If Supabase Vault is enabled, store the secret there and read it inline so
the cron definition contains no plaintext:

```sql
select vault.create_secret('__CRON_SECRET__', 'cron_secret');

select cron.schedule(
  'weekly-ai-report-sunday',
  '0 1 * * 0',
  $$
  select net.http_post(
    url := 'https://project--5f80e415-275e-4eff-9d6d-e2c7cd6502e3.lovable.app/api/public/hooks/weekly-ai-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## 4. Inspect

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 20;
```