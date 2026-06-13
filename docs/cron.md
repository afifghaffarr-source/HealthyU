# Cron Setup

Public hook endpoints under `/api/public/hooks/*` are authenticated via the
`CRON_SECRET` runtime secret (validated by `requireCronSecret`). They **do
not** accept the Supabase publishable / anon key as auth.

> **Update `https://healthyu.id` to your real Cloudflare Pages domain**
> (e.g. `https://healthyu.pages.dev` for preview or your custom domain)
> before running the SQL below.

## 1. Make sure `CRON_SECRET` is set

Provisioned in Cloudflare Pages → Settings → Environment variables.
The variable applies to all environments; rotate by re-issuing in the dashboard.

```bash
openssl rand -hex 32
```

## 2. Schedule the cron jobs

Run as ad-hoc SQL via the Supabase DB console (never commit the secret
to a migration). Replace `__CRON_SECRET__` with the real value, and
`healthyu.id` with your real Cloudflare Pages domain.

```sql
select cron.schedule(
  'recipes-trending-snapshot-weekly',
  '0 0 * * 1',
  $$
  select net.http_post(
    url := 'https://healthyu.id/api/public/hooks/recipes-trending-snapshot',
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
    url := 'https://healthyu.id/api/public/hooks/weekly-ai-report',
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
    url := 'https://healthyu.id/api/public/hooks/weekly-ai-report',
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
