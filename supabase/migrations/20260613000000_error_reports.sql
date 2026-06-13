-- Error reporting table — replaces Lovable's __lovableEvents.captureException.
-- Writes are restricted to the service role (server-side via server functions
-- or admin client) and authenticated users can write their own errors.
-- No public read — view via Supabase Studio or admin dashboard.

create table if not exists public.error_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  source text not null,
  boundary text not null,
  message text not null,
  stack text null,
  context jsonb not null default '{}'::jsonb,
  route text null,
  handled boolean not null default false,
  severity text not null default 'error',
  created_at timestamptz not null default now()
);

create index if not exists error_reports_user_id_idx on public.error_reports(user_id);
create index if not exists error_reports_created_at_idx on public.error_reports(created_at desc);
create index if not exists error_reports_severity_idx on public.error_reports(severity) where severity in ('error', 'warning');

alter table public.error_reports enable row level security;

-- No public SELECT. Reads happen via the service role in admin tools.
-- No anon/authenticated INSERT either — only the service role inserts.
-- (Boundaries call a server function that does the insert; see /api/log-error.)
