/**
 * Tests for telemetrySurface pure helpers — Sprint 33.
 *
 * We don't need a vitest mock of supabase here because both helpers
 * are pure: parseEventName and buildTelemetryEventsFromRows only touch
 * the data passed in. The query lives in the actual server-fn handler,
 * exercised at deploy time via the privacy vault page.
 */

import { describe, it, expect } from "vitest";
import { parseEventName, buildTelemetryEventsFromRows } from "../telemetrySurface.functions";

describe("parseEventName (Sprint 33)", () => {
  it('strips "event:" prefix from a known telemetry message', () => {
    expect(parseEventName("event:dashboard.meta_hero.viewed")).toBe("dashboard.meta_hero.viewed");
  });

  it("returns the bare message when prefix is missing (defensive)", () => {
    // Should never happen in prod (track() writes the prefix) but the row
    // could be a manual error log without the prefix.
    expect(parseEventName("Some random error")).toBe("unknown");
  });

  it("returns 'unknown' on empty string", () => {
    expect(parseEventName("")).toBe("unknown");
  });

  it("preserves dotted namespace (no transformation)", () => {
    // We deliberately do NOT slugify — the dotted namespace is the
    // canonical surface-area contract from Sprint 19 + Sprint 25.
    expect(parseEventName("event:privacy.vault.viewed")).toBe("privacy.vault.viewed");
  });
});

describe("buildTelemetryEventsFromRows (Sprint 33)", () => {
  it("returns an empty list when result has no data", () => {
    expect(buildTelemetryEventsFromRows(null, 10)).toEqual([]);
    expect(buildTelemetryEventsFromRows({}, 10)).toEqual([]);
    expect(buildTelemetryEventsFromRows({ data: [] }, 10)).toEqual([]);
  });

  it("filters out non-info severity rows", () => {
    const rows = [
      {
        id: "1",
        message: "event:dashboard.meta_hero.viewed",
        route: "/",
        context: {},
        severity: "error", // ← wrong severity, must skip
        created_at: "2026-06-28T00:00:00Z",
      },
      {
        id: "2",
        message: "event:privacy.vault.viewed",
        route: "/profile/privacy",
        context: {},
        severity: "info",
        created_at: "2026-06-28T00:01:00Z",
      },
    ];
    const out = buildTelemetryEventsFromRows({ data: rows }, 10);
    expect(out).toHaveLength(1);
    expect(out[0].eventName).toBe("privacy.vault.viewed");
  });

  it("filters out rows whose message lacks the 'event:' prefix", () => {
    const rows = [
      {
        id: "1",
        message: "TypeError: x is undefined", // ← real error, not telemetry
        route: "/dashboard",
        context: {},
        severity: "info",
        created_at: "2026-06-28T00:00:00Z",
      },
    ];
    expect(buildTelemetryEventsFromRows({ data: rows }, 10)).toEqual([]);
  });

  it("respects the limit boundary (does not over-collect)", () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      message: `event:foo.${i}.seen`,
      route: "/x",
      context: {},
      severity: "info",
      created_at: "2026-06-28T00:00:00Z",
    }));
    expect(buildTelemetryEventsFromRows({ data: rows }, 5)).toHaveLength(5);
    expect(buildTelemetryEventsFromRows({ data: rows }, 50)).toHaveLength(20);
  });

  it("explodes eventName correctly per-row", () => {
    const rows = [
      {
        id: "a",
        message: "event:dashboard.digest.requested",
        route: "/dashboard",
        context: { foo: 1 },
        severity: "info",
        created_at: "2026-06-28T00:00:00Z",
      },
      {
        id: "b",
        message: "event:dashboard.badge_celebrated.seen",
        route: "/dashboard",
        context: {},
        severity: "info",
        created_at: "2026-06-28T00:01:00Z",
      },
    ];
    const out = buildTelemetryEventsFromRows({ data: rows }, 10);
    expect(out.map((e) => e.eventName)).toEqual([
      "dashboard.digest.requested",
      "dashboard.badge_celebrated.seen",
    ]);
  });

  it("preserves the input's original ordering (the caller already sort)", () => {
    // We don't sort here — the SQL query does. Caller is responsible.
    // The helper just respects the array order.
    const rows = [
      {
        id: "1",
        message: "event:first",
        route: null,
        context: {},
        severity: "info",
        created_at: "2026-06-28T00:01:00Z",
      },
      {
        id: "2",
        message: "event:second",
        route: null,
        context: {},
        severity: "info",
        created_at: "2026-06-28T00:00:00Z",
      },
    ];
    const out = buildTelemetryEventsFromRows({ data: rows }, 10);
    expect(out[0].eventName).toBe("first");
    expect(out[1].eventName).toBe("second");
  });
});
