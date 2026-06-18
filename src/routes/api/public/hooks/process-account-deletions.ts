import { createFileRoute } from "@tanstack/react-router";
import { requireCronSecret } from "@/lib/cronAuth.server";

/**
 * AUDIT-020 — Account deletion cron worker (right-to-erasure completion).
 *
 * The `/profile/privacy` UI lets users request account deletion via
 * `pdpRights.requestAccountDeletion`, which writes a row to
 * `account_deletion_requests` with status='pending' and a 24h
 * cancellation grace window. This cron is the OTHER half of the
 * right-to-erasure flow: every 24h it picks up pending requests that
 * are >24h old and calls `public.process_account_deletion(user_id)`,
 * which atomically deletes the user from auth.users and all 86
 * user-owned tables.
 *
 * Schedule: daily at 03:00 UTC. See `docs/cron.md` for the SQL.
 *
 * Response shape:
 *   { ok, processed: [{user_id, result}], skipped, errors, reset, timestamp }
 *
 *   - `processed` is the per-user SQL function return (counts per table).
 *   - `skipped` is requests that had no `pending` row at processing time
 *     (the user cancelled in the grace window, or another cron run
 *     beat us to it).
 *   - `errors` is per-user failures that didn't roll back; the cron
 *     continues with the next user so one bad apple doesn't block the
 *     queue.
 *   - `reset` is the count of stuck 'processing' requests we auto-
 *     recovered at the start of this run (see STUCK_PROCESSING
 *     constant below).
 */
export const Route = createFileRoute("/api/public/hooks/process-account-deletions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = requireCronSecret(request);
        if (unauthorized) return unauthorized;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 24h grace window matches what the UI promises the user
        // ("you can cancel within 24h"). Anything older than that
        // gets processed.
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // 0. Auto-recover stuck 'processing' requests before fetching
        //    the pending queue. A request can get stuck in 'processing'
        //    if a previous cron run's worker died mid-call after the
        //    SQL function committed the status update but before
        //    completing the deletions (e.g. CF Worker evicted, network
        //    drop, OOM). Without this reset those rows would never
        //    move to 'pending' and the user's data would sit in the
        //    DB indefinitely — a UU PDP gap.
        //
        //    Threshold is 1 hour. The SQL function itself is atomic
        //    and should complete in seconds; an hour is comfortably
        //    longer than the legitimate worst case (a deletion with
        //    very large per-table row counts might take a few minutes
        //    on a slow day). Anything still in 'processing' after
        //    an hour is, by definition, stuck.
        //
        //    We set processed_at = NULL on reset so the next run's
        //    pending-query doesn't accidentally re-flag it as a
        //    fresh stuck-processing (the .lt filter is on the
        //    processed_at timestamp, not on status alone).
        const STUCK_PROCESSING_MINUTES = 60;
        const stuckThreshold = new Date(
          Date.now() - STUCK_PROCESSING_MINUTES * 60 * 1000,
        ).toISOString();
        const { data: resetRows, error: resetError } = await supabaseAdmin
          .from("account_deletion_requests")
          .update({ status: "pending", processed_at: null })
          .eq("status", "processing")
          .lt("processed_at", stuckThreshold)
          .select("id");

        let reset = 0;
        if (resetError) {
          // Non-fatal: log and continue with the pending queue. The
          // stuck requests will get another chance in the next cron
          // run. We'd rather process new pending requests than fail
          // the whole cron over a recovery step.
          console.error(
            "process-account-deletions: stuck-processing reset failed:",
            resetError.message,
          );
        } else if (resetRows) {
          reset = resetRows.length;
          if (reset > 0) {
            console.log(
              `process-account-deletions: auto-recovered ${reset} stuck 'processing' request(s) older than ${STUCK_PROCESSING_MINUTES}min`,
            );
          }
        }

        // 1. Find all pending requests past the grace window.
        const { data: requests, error: fetchError } = await supabaseAdmin
          .from("account_deletion_requests")
          .select("user_id, requested_at, reason")
          .eq("status", "pending")
          .lt("requested_at", cutoff);

        if (fetchError) {
          return Response.json(
            { ok: false, error: fetchError.message, timestamp: new Date().toISOString() },
            { status: 500 },
          );
        }

        const processed: Array<{ user_id: string; result: unknown }> = [];
        const errors: Array<{ user_id: string; message: string }> = [];

        // 2. For each request, call the SQL function. Failures on
        //    one user don't block the rest of the queue — we log
        //    the error and continue. (The SQL function itself is
        //    atomic: it rolls back its own partial state on error.)
        for (const req of requests ?? []) {
          const { data, error } = await supabaseAdmin.rpc("process_account_deletion", {
            p_user_id: req.user_id,
          });
          if (error) {
            errors.push({ user_id: req.user_id, message: error.message });
            // ponytail: the function already rolls back on error, so
            // the request row stays 'pending' for the next run. We
            // log here so ops can see WHICH user failed and why.
            console.error("process-account-deletions: failed for user", req.user_id, error.message);
          } else {
            processed.push({ user_id: req.user_id, result: data });
          }
        }

        return Response.json({
          ok: true,
          processed,
          errors,
          reset,
          counts: {
            processed: processed.length,
            errors: errors.length,
            reset,
          },
          timestamp: new Date().toISOString(),
        });
      },
    },
  },
});
