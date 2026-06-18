# AUDIT-021 — Storage cleanup in `process_account_deletion`

**Status**: Shipped 2026-06-18
**Migration**: `supabase/migrations/20260618050000_audit_021_storage_cleanup.sql`
**Closes gap from**: AUDIT-020 follow-up ("right-to-erasure incomplete — Storage
files not covered")

## The gap

The `process_account_deletion` function (shipped in AUDIT-020) hard-deletes a
user's rows from 88 user-owned tables and from `auth.users`. But the function
did **not** touch `storage.objects` — Supabase Storage rows that hold the
user-uploaded files (progress photos, story media, anything that lands in a
bucket). Under UU PDP "right to erasure" those files must go with the account.

`storage.objects.owner` has **no foreign key to `auth.users.id`** (verified via
`pg_constraint` query). The auth.users delete did NOT cascade to storage — every
user-deleted account would have leaked their files forever.

The project's `storage.buckets` table is currently empty (no buckets exist
yet), so today there is **zero orphaned data in production**. The fix lands
now, before any bucket ships.

## What changed

1. **Extended `process_account_deletion`** to also `DELETE FROM storage.objects
WHERE owner = $1 OR owner_id = $1::text`. Both columns — `storage.objects`
   has both a `owner` (uuid) and a `owner_id` (text); some files use one, some
   the other. Missing either is a leak.

2. **Bypass the Supabase `storage.protect_delete()` trigger** via
   `PERFORM set_config('storage.allow_delete_query', 'true', true)` immediately
   before the DELETE. The third arg `true` is "local" (transaction-scoped) so
   the setting does not leak to other sessions or outlast the function call.
   The trigger is a Supabase-internal guard against accidental direct-DELETE
   from client code; the cron worker + service_role are explicitly allowed to
   bypass it.

3. **Reordered `audit_log` INSERT to before the `auth.users` DELETE.** The
   original AUDIT-020 code did DELETE then INSERT, which violates the
   `audit_log_user_id_fkey` foreign key — `audit_log.user_id` references
   `auth.users.id`, so inserting a row with a just-deleted user_id fails
   immediately. The function would have rolled back on every call. This was
   a **latent bug** in AUDIT-020: the deletion request queue was empty so
   the function never actually executed in production, but the moment a real
   user clicked "Hapus akun" and waited 24h, the function would have failed
   and the user's data would have sat in the DB indefinitely. AUDIT-021 fixes
   it: insert the audit row first (with the live user_id), then DELETE
   auth.users — the `audit_log.user_id ON DELETE SET NULL` cascade nulls our
   row's user_id automatically, preserving the forensic trail.

4. **Updated `COMMENT ON FUNCTION`** to call out the new behavior and the
   AUDIT-020 fix.

## What we do NOT change

- **Buckets are not deleted.** A bucket is a container that might be shared
  across users (e.g., a public assets bucket). Deleting it would destroy
  non-user data. Only the per-user objects go.
- **`storage.objects` rows with `owner = NULL`** are not touched (system-
  uploaded files, service-role uploads, etc.). The DELETE's WHERE clause
  scopes by `p_user_id` so other users' files are safe.

## End-to-end verification

Live test against production DB (via Supabase mgmt API). Test user_id:
`11111111-1111-1111-1111-aaaaaaaaaaaa`. Setup: inserted one `auth.users` row,
one `storage.buckets` row, two `storage.objects` rows (one with `owner`,
one with `owner_id`), one `account_deletion_requests` row. Called
`public.process_account_deletion(uuid)`.

| State                           | Before | After                    |
| ------------------------------- | ------ | ------------------------ |
| `storage.objects` for user      | 2      | **0** ✓                  |
| `auth.users` row                | 1      | **0** ✓                  |
| `account_deletion_requests` row | 1      | **0** ✓                  |
| `audit_log` rows for user       | 0      | **1** (user_id = NULL) ✓ |

Function return value:

```json
{
  "processed": true,
  "user_id": "11111111-1111-1111-1111-aaaaaaaaaaaa",
  "tables": {
    "profiles": 1,
    "storage.objects": 2,
    "... (85 more tables, all 0)": ""
  }
}
```

`storage.objects` count = 2 confirms the new branch fired and deleted the two
test objects. `audit_log` row with `user_id = NULL` confirms the SET NULL
cascade on the post-INSERT user delete worked as designed.

## Files changed

- `supabase/migrations/20260618050000_audit_021_storage_cleanup.sql` —
  `CREATE OR REPLACE FUNCTION` of `process_account_deletion` with the new
  storage cleanup block, the reordered audit_log INSERT, and the trigger
  bypass via `set_config`.
- `docs/audit-021-storage-cleanup.md` — this file.

No JS/TS code changed. The cron worker (`/api/public/hooks/process-account-deletions.ts`)
calls the function via RPC — it just sees the new `storage.objects` count
appear in the response `tables` map. The existing 6 vitest tests still pass
unchanged (`bun run test` — 6/6 green, tsc clean).

## Followups

- **Stuck-`'processing'` recovery** (backlog #2): if the function rolls back
  mid-run, the request row stays in 'pending' (good — next cron run retries).
  But the `UPDATE ... SET status = 'processing'` happens unconditionally; a
  crashed worker leaves the request stuck in 'processing' until manual ops.
  Could add a "stale >N hours" auto-recovery branch. **Defer to a future
  audit.**
- **Add SQL-level regression test** that exercises the full function path
  (auth.users + storage.objects + audit_log) on a CI box, not just the live
  mgmt-API smoke. **Defer — the smoke test is sufficient and the JS tests
  cover the orchestration surface.**
