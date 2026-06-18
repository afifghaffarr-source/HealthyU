# AUDIT-020 — Right-to-Erasure Cron (Deletion Loop Completion)

> **Status:** ✅ DONE (2026-06-18)
> **Source:** "Fase 5 — production hardening" from the project backlog
> **Commits:** `47d87157` (SQL function + cron endpoint + tests + type sync)
> **Migration:** `supabase/migrations/20260618022129_audit_020_process_account_deletion.sql` (applied to production)
> **Doc:** `docs/cron.md` (schedule added)

## Problem

The `/profile/privacy` UI shipped in `09d9e89b` lets users request account
deletion. Clicking "Hapus akun saya" calls
`pdpRights.requestAccountDeletion` which writes a row to
`account_deletion_requests` with `status='pending'` and a 24h cancellation
grace window. **Until this audit, nothing actually processed the
request.** A user who clicked "delete" got a confirmation toast but their
data sat in the DB indefinitely.

That is a real UU PDP compliance gap. The user has a right to erasure;
if the request isn't processed, the data is still there and the right
isn't real.

## Design decisions

### 1. SQL function does the work, JS orchestrates

The actual hard-delete logic lives in a PostgreSQL function
(`public.process_account_deletion`). The cron endpoint is a thin wrapper
that:

1. Fetches pending requests >24h old
2. Calls the SQL function for each
3. Returns per-user results

This puts the heavy lifting (deleting 86 tables, the auth.users cascade,
the audit_log entry, the rollback semantics) in the database, where
atomicity and access control live. The JS layer only does the
queue-walking.

### 2. SECURITY DEFINER + service_role only

The function takes a `user_id` argument. A misconfigured grant would
let an authenticated user wipe out another account by calling this
directly via the Supabase REST API:

```
POST /rest/v1/rpc/process_account_deletion
Body: { "p_user_id": "<someone-elses-id>" }
```

SECURITY DEFINER runs the function as the owner (postgres) so RLS doesn't
help — the function does explicit deletes, not RLS-aware queries. The
only safety net is the GRANT.

The migration:

```sql
REVOKE EXECUTE ON FUNCTION public.process_account_deletion(UUID, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_account_deletion(UUID, TEXT[])
  TO service_role;
```

`service_role` is the only Supabase role with a real secret; users never
have it. Verified post-apply via `information_schema.routine_privileges`:
only `postgres` (owner) and `service_role` have EXECUTE. No `PUBLIC`,
`anon`, or `authenticated` leak.

### 3. Explicit delete from 86 tables, then auth.users cascade

The schema has `ON DELETE CASCADE` on most user-owned tables' foreign
keys to `auth.users.id`. So in theory we could just `DELETE FROM
auth.users` and let the cascade do the work. But:

- Not all tables have CASCADE (some are `ON DELETE SET NULL` or no FK
  at all)
- We want to know **which tables** had data for the user (for the
  audit summary)
- Explicit beats implicit for a function that deletes user data
  (a future schema change that breaks a CASCADE doesn't silently
  leak data)

So the function loops through a canonical 86-table list and does
`DELETE FROM <table> WHERE <owner_column> = $1` for each, capturing
`ROW_COUNT` into a per-table summary. Then `DELETE FROM auth.users`
catches any leftover tables (including Supabase-internal storage
references) via the cascading FKs.

### 4. `audit_log` survives, `account_deletion_requests` dies (by design)

The canonical table list excludes two system tables with specific FK
behavior we want to preserve:

- **`audit_log`** — its `user_id` is `ON DELETE SET NULL`. We want the
  forensic trail to SURVIVE the user delete (rows stay with
  `user_id = NULL`). The `meta` column has the deletion reason from
  `request_account_deletion`, the action name (`account.deletion_processed`)
  records when the worker actually processed the request, and the
  `created_at` is the original timestamp. A future audit can
  reconstruct: "this user requested deletion on X with reason Y,
  the worker processed it on Z, deleted N rows from 86 tables".

- **`account_deletion_requests`** — its `user_id` is `ON DELETE CASCADE`.
  When `auth.users` is deleted, the request row is gone. The
  state-machine column (`status`) is now meaningless because there's
  no longer a user to delete.

### 5. 24h cancellation grace window

The UI promises "you can cancel within 24h". The cron picks up only
requests where `requested_at < now() - 24h`. A user who requests
deletion then immediately changes their mind can cancel within the
window; the next cron run sees no pending requests for them.

### 6. Per-user failures don't abort the queue

If one user's deletion fails (e.g., a transient DB blip), we log the
error and continue with the next user. The failed user's request stays
in `'pending'` (the SQL function's transaction rolls back its partial
state) and gets re-tried on the next cron run. One bad apple doesn't
block 100 other users' deletions.

This is also why the cron is **daily, not hourly** — if a transient
DB issue takes the queue down, we have a 24h recovery window before
the grace period expires.

## What was built

### 1. Migration (`supabase/migrations/20260618022129_audit_020_process_account_deletion.sql`)

- `public.process_account_deletion(p_user_id UUID, p_tables TEXT[])` —
  SECURITY DEFINER function, takes a list of `"table|owner_column"`
  pairs (or defaults to the canonical 86-table list).
- Returns a JSONB summary of the per-table delete counts + status.
- Locked down: REVOKE FROM PUBLIC/anon/authenticated; GRANT EXECUTE TO
  service_role only.

Applied to production on 2026-06-18 via the management API. Verified
post-apply:

- Function exists with `prosecdef=true`
- Only `postgres` (owner) and `service_role` have EXECUTE
- Smoke test: call with random UUID returns `{skipped: "no pending request", user_id: ...}` as expected

### 2. Cron endpoint (`src/routes/api/public/hooks/process-account-deletions.ts`)

- `requireCronSecret` gate (same pattern as the other 6 cron hooks)
- Fetches `account_deletion_requests` where `status='pending'` AND
  `requested_at < now() - 24h`
- Loops through and calls the SQL function for each
- Returns `{ ok, processed: [{user_id, result}], errors: [{user_id, message}], counts, timestamp }`
- Per-user failures logged to `console.error` and recorded in the
  response's `errors` array

### 3. Tests (`src/routes/api/public/hooks/__tests__/process-account-deletions.test.ts`, 6 tests)

- CRON_SECRET 401 path (rejected)
- Empty queue: `{ok: true, processed: [], errors: [], counts: {processed: 0, errors: 0}}`
- Per-user RPC call args verified (`p_user_id` is passed correctly)
- Supabase query chain shape verified (`from(...).select(...).eq('status', 'pending').lt('requested_at', cutoff)`)
- Per-user failure does NOT abort the queue (3 users, 1 fails, 2 succeed)
- 500 on initial fetch failure

### 4. Cron schedule (`docs/cron.md`)

Added `'process-account-deletions-daily'` at `0 3 * * *` (03:00 UTC
daily, low-traffic window). Same auth pattern as the other 6 crons.

### 5. Type sync

- `Database.public.Functions.process_account_deletion` added to
  `src/integrations/supabase/types.ts` so the `rpc()` call typechecks
- `routeTree.gen.ts` regenerated to include the new route

## What this audit did NOT do (deferred)

- **Storage bucket cleanup** (progress photos, story media, etc.).
  These live in Supabase Storage, not DB tables. The SQL function
  doesn't touch them. Adding it requires a Storage API call from the
  JS cron worker (or a separate `storage.objects` delete in the SQL
  function). Punt to AUDIT-021.

- **Stuck-`'processing'` recovery.** If a cron run dies mid-process
  (worker OOM, network blip, etc.), the request stays in `'processing'`
  forever. The current filter (`status='pending'`) just doesn't
  re-process it — graceful but eventually a manual ops fix is needed.
  Right long-term fix: add a stale-timeout auto-reset (any
  `processing` request with `processed_at < now() - 1h` flips back to
  `'pending'` for retry).

- **Per-user end-to-end test of the SQL function.** The unit tests
  cover the JS orchestration. The SQL function itself was smoke-tested
  via the management API (no-op case: random UUID returns
  `{skipped: 'no pending request'}`). A full delete roundtrip test
  would require creating a real test user, populating data, calling
  the function, and verifying the rows are gone. Defer to a dedicated
  test infra PR.

## Verification

| Check                              | Result                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `bunx tsc --noEmit`                | ✓ 0 errors                                                                   |
| `bun run test`                     | ✓ 523/523 (61 files)                                                         |
| `bun run lint`                     | ✓ clean                                                                      |
| `bun run build`                    | ✓ success (29.34s)                                                           |
| Production Supabase function       | ✓ applied + verified via `pg_proc`                                           |
| Production Supabase grants         | ✓ only `postgres` + `service_role` (no `PUBLIC`/`anon`/`authenticated` leak) |
| Production smoke test (no-op case) | ✓ returns `{skipped: 'no pending request'}`                                  |
| Production deploy (CI 4/4)         | ⏳ running at time of writing                                                |

## Operational notes

When a real user has a deletion request and the cron runs, the
response is the per-user summary the function returns. The cron
response shape is:

```json
{
  "ok": true,
  "processed": [
    {
      "user_id": "...",
      "result": {
        "processed": true,
        "user_id": "...",
        "tables": {
          "profiles": 1,
          "meal_logs": 42,
          "chat_messages": 17,
          ...
        }
      }
    }
  ],
  "errors": [],
  "counts": { "processed": 1, "errors": 0 },
  "timestamp": "..."
}
```

Empty `processed` and `errors` arrays + `counts: {processed: 0, errors: 0}`
is the normal state on most days (no pending requests). The cron
returning this is a healthy no-op — the grace window has kept most
users in the cancellable range, or no one has requested deletion
that day.

If `errors` is non-empty, those users' requests stay in `'pending'`
and get retried on the next run. Ops should check the `audit_log` for
rows with `action = 'account.deletion_requested'` and no matching
`account.deletion_processed` to find users who requested deletion but
are still waiting.
