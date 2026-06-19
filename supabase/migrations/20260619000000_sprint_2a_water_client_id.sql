-- Sprint 2a: Offline-first water tracker (Dexie sync)
-- Adds client_id column to water_logs for idempotent sync from offline devices.
-- Same client_id submitted twice = same record, no duplicate.

ALTER TABLE public.water_logs
  ADD COLUMN IF NOT EXISTS client_id UUID;

-- Unique partial index: per-user uniqueness of client_id (NULL = not yet synced)
-- Allows multiple rows without client_id (legacy data) but prevents dupes for synced rows.
CREATE UNIQUE INDEX IF NOT EXISTS water_logs_user_client_id_uniq
  ON public.water_logs (user_id, client_id)
  WHERE client_id IS NOT NULL;

-- Comment for future devs
COMMENT ON COLUMN public.water_logs.client_id IS
  'UUID generated client-side (Dexie). Enables idempotent offline-first sync.';
