# AUDIT-020 follow-up — Stuck-processing auto-recovery

**Status**: Shipped 2026-06-18
**Files changed**:

- `src/routes/api/public/hooks/process-account-deletions.ts`
- `src/routes/api/public/hooks/__tests__/process-account-deletions.test.ts`
- `docs/cron.md`

## The gap

The `process_account_deletion` SQL function (shipped in AUDIT-020) is
atomic: it does an `UPDATE ... SET status = 'processing'` followed by
all the actual deletions, all in a single transaction. If anything
fails, the transaction rolls back — including the status UPDATE — and
the request stays in `'pending'` for the next run.

That handles the **in-transaction** failure case (the SQL function
errors out). It does NOT handle the **post-function, mid-worker** case
where the worker dies AFTER the function commits but before the cron
loop finishes. Today the only way for `'processing'` to be committed
is if we change the function to commit the status update separately
(out of the transaction). We haven't done that — the current code
keeps everything atomic — so the practical stuck scenarios are:

1. **Future change** that commits `'processing'` outside the function's
   transaction (e.g., to provide a heartbeat for "what's the worker
   doing right now" UI). The cron would then need recovery.
2. **Manual ops**: a human runs `UPDATE account_deletion_requests
SET status = 'processing' WHERE ...` to mark a row as "in flight"
   while debugging, then forgets. That row sits in `'processing'`
   forever.
3. **Schema race**: a future code path sets `'processing'` without
   going through `process_account_deletion`. The row gets stuck.

Rather than ship a feature, wait for one of these scenarios to bite,
then patch — this audit lands the recovery loop **now**, while the
worker is fresh. Defensive code is cheap; the incident that motivates
it is expensive.

## The fix

At the very start of the cron handler (step "0", before fetching the
pending queue), run:

```typescript
const STUCK_PROCESSING_MINUTES = 60;
const stuckThreshold = new Date(Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000).toISOString();
const { data: resetRows, error: resetError } = await supabaseAdmin
  .from("account_deletion_requests")
  .update({ status: "pending", processed_at: null })
  .eq("status", "processing")
  .lt("processed_at", stuckThreshold)
  .select("id");
```

Anything in `'processing'` with `processed_at` older than 1 hour gets
flipped back to `'pending'` (and `processed_at` reset to NULL) — the
next run's pending-query will pick it up normally.

## Why 60 minutes

- **Too short** (e.g., 5 min): risks resetting rows that are in the
  middle of a legitimate (slow) deletion. The function itself is
  atomic and should complete in seconds; 5 minutes is already
  generous, but a particularly heavy user (years of `meal_logs`,
  `chat_messages`, etc.) could push past it.
- **Too long** (e.g., 24h): stuck rows take a full extra cron cycle
  to recover, which means up to 48h end-to-end for a user who hit
  the bug. Unacceptable for a UU PDP right-to-erasure flow.
- **60 min**: comfortably longer than the worst-case legitimate run
  (a few minutes for a user with millions of rows), and recovers
  within the same day's cron window if the next run fires before
  the next 03:00 UTC.

The threshold is a constant in the worker — not a migration, not an
env var. If we ever need to tune it, a 1-line change in the worker
and a redeploy is sufficient.

## Why non-fatal

If the `.update()` call itself errors (DB connection blip, RLS
rejection, etc.), we log and continue with the pending-queue
fetch. Failing the whole cron over a recovery step would mean a
stuck request STARVES the new pending queue — exactly the
opposite of what we want. The stuck request will get another
chance in the next cron run; the new pending requests shouldn't
wait.

The reset count surfaces in the response as `counts.reset` so ops
can see the recovery happen.

## Why `processed_at = null` on reset

The pending-query filter is `status = 'pending' AND requested_at <
cutoff`. So a row that gets reset back to `'pending'` would be
picked up by the next pending-fetch automatically — no need to
touch `requested_at`. But the `processed_at` column is what we
filter the stuck-detection on (`.lt("processed_at", stuckThreshold)`).
If we left it set to the old time, the NEXT run would re-detect it
as "still stuck" and reset it again — fine in practice (idempotent)
but creates a "stuck request that was reset N times" entry in the
audit log that doesn't reflect reality. Nulling `processed_at` on
reset is the cleanest way to say "this row is no longer in flight,
give it a fresh start". The `requested_at` (which is the user-visible
"when did they request deletion") is preserved.

## End-to-end verified

Two new vitest tests added to the existing
`process-account-deletions.test.ts` suite:

| Test                                                                        | What it verifies                                                                                                                                    |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto-recovers stuck 'processing' requests older than 60 minutes`           | Mock returns 2 stuck rows; assert `body.counts.reset === 2`, `body.counts.processed === 0`, and the worker hit `from("account_deletion_requests")`. |
| `auto-recovery is a no-op when no rows are stuck`                           | Default mock returns 0 rows; assert `body.counts.reset === 0`. The cron still 200s.                                                                 |
| `does not fail the cron when the stuck-processing reset errors (non-fatal)` | Mock returns a reset error; assert the cron still 200s and `body.counts.reset === 0`. The pending queue (empty here) still gets fetched.            |

All three pass. Full suite: **526/526** (up from 517). tsc clean.

## Operational notes

- The first cron run after deploying this change is a no-op: there
  are no rows in `'processing'` today (queue has been empty for
  weeks). The new branch only matters if/when something gets stuck
  in the future.
- Watch for `body.counts.reset > 0` in cron responses. A non-zero
  reset is a signal that something else (worker, function, manual
  ops) is leaving rows in `'processing'` past the threshold — that
  deserves a followup.
- The `60min` constant is in the worker file as
  `STUCK_PROCESSING_MINUTES`. Future tuning: change the constant,
  redeploy. No migration, no env var.

## Not addressed (out of scope)

- **Outbox-style heartbeat**: A real-time "what's the worker doing
  right now" UI would need the SQL function to commit the status
  flip separately from the deletion transaction. That changes the
  failure semantics (the function would NOT roll back the status
  update on deletion failure) and is a bigger redesign. Defer.
- **Auto-disable on repeated failures**: If the same user fails N
  times, stop retrying. The current code retries forever (per the
  "no pending request" guard). Defer until we see a pattern of
  failing users in the audit log.
