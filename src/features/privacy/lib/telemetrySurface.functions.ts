/**
 * Telemetry events surface — read-side for the Sprint 19 `track()`
 * instrumentation that lives in `error_reports`.
 *
 * Sprint 33: surfaces what `track()` writes (severity='info',
 * mechanism='telemetry', message starts with 'event:') back to the
 * current user as a small Indonesian-labelled timeline. Same privacy
 * posture as Sprint 21 AuditLogSection — never anything identifying
 * beyond what the user themselves triggered.
 *
 * Ponytail: zero new tables, zero new cron jobs. Reuses the existing
 * `error_reports` table where every `track()` invocation already lands
 * in production. The tradeoff: this fn uses the service-role client
 * because error_reports RLS does not allow ordinary users to SELECT
 * (writes go through /api/log-error with service role only).
 *
 * Never throws on empty result. userId filter is explicit because we
 * bypass RLS via the service-role client.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseInput } from "@/lib/validation";
import { z } from "zod";

type LooseSB = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: unknown,
      ) => {
        order: (
          col: string,
          options: { ascending: boolean },
        ) => {
          limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
};

export type TelemetryEvent = {
  id: string;
  eventName: string;
  route: string | null;
  createdAt: string;
};

/**
 * Strip the `event:` prefix that `track()` writes into the message column
 * so the UI can render the bare event name (e.g. `dashboard.meta_hero.viewed`).
 * Returns `"unknown"` if the message doesn't follow the prefix convention —
 * safer than crash because a brand-new event-type added in a future sprint
 * would otherwise blow up the section.
 */
export function parseEventName(message: string): string {
  const prefix = "event:";
  if (!message.startsWith(prefix)) return "unknown";
  return message.slice(prefix.length);
}

/**
 * Pure helper: project raw `error_reports` rows into the public
 * `TelemetryEvent` shape, filtering to telemetry rows only.
 * Exported for unit tests — keep this side-effect free.
 */
export function buildTelemetryEventsFromRows(result: unknown, limit: number): TelemetryEvent[] {
  const raw = (result as { data?: Array<Record<string, unknown>> })?.data ?? [];
  const events: TelemetryEvent[] = [];
  for (const row of raw) {
    if (String(row.severity) !== "info") continue;
    const msg = String(row.message ?? "");
    if (!msg.startsWith("event:")) continue;
    const meta = (row.context as Record<string, unknown>) ?? {};
    events.push({
      id: String(row.id ?? ""),
      eventName: parseEventName(msg),
      route: (row.route as string | null) ?? null,
      createdAt: String(row.created_at ?? ""),
    });
    if (events.length >= limit) break;
  }
  return events;
}

/**
 * Returns the most-recent telemetry events for the current user.
 * `limit` is clamped to [1, 50] defensively — same guard the audit
 * log section uses (Sprint 21) for parity.
 */
export const getMyRecentTelemetryEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    parseInput(z.object({ limit: z.number().int().min(1).max(50).default(20) }), i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const sb = supabaseAdmin as unknown as LooseSB;
    const result = await sb
      .from("error_reports")
      .select("id, message, source, route, context, severity, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(data.limit * 2);

    return { events: buildTelemetryEventsFromRows(result, data.limit) };
  });

/** Sprint 42: event count aggregation for telemetry chart */
export type EventCount = { eventName: string; count: number };

export const getTelemetryEventCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const sb = supabaseAdmin as unknown as LooseSB;
    const result = await sb.from("error_reports").select("message").eq("user_id", userId);

    const counts: Record<string, number> = {};
    const rows = (result as { data?: Array<{ message: string }> })?.data ?? [];
    for (const row of rows) {
      const name = parseEventName(row.message);
      if (name === "unknown") continue;
      counts[name] = (counts[name] ?? 0) + 1;
    }

    const events: EventCount[] = Object.entries(counts)
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count);

    return { events };
  });
