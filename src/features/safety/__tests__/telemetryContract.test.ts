/**
 * Sprint 36 — Clinical telemetry contract lock.
 *
 * Per project memory "Clinical vs engineering safety (2026-06-17)":
 *   engineering telemetry (which keywords fire, how often) = OK to ship.
 *   clinical responses (when to escalate, what to tell user)  = DEFERRED.
 *
 * These 6 tests lock the privacy/safety boundaries around the two parallel
 * telemetry systems so we get a CI failure if anyone drifts. Each test
 * inspects static source — no DB, no network — so it runs in <50ms.
 *
 * The two systems:
 *   1. `log_audit_event` RPC (Supabase `audit_log` table, entity="chat")
 *      - Source: chat.stream.ts (action: chat.safety.{crisis,blocked,ed_disclosure})
 *      - UI : audit-log-section.tsx LABEL_MAP (Indonesian label)
 *      - Lives forever (legal/compliance audit trail)
 *
 *   2. `reportSafetyEvent` (Supabase `error_reports` table)
 *      - Source: WeekCalendar + future detectors
 *      - UI : telemetry-events-section.tsx MUST NOT label these (clinical
 *              privacy boundary — user should not see "ED detected" in their
 *              "app activity" timeline; that would be alarming AND reveal
 *              health patterns)
 *      - Filter: buildTelemetryEventsFromRows only picks rows whose message
 *              starts with literal "event:" prefix; safety events use
 *              "Safety event: <kind>" so they are excluded by design.
 *
 * If you add a new SafetyEventKind OR chat.safety.* action, you MUST
 * update BOTH `_meta` audit-log mirror + audit-log-section.tsx label,
 * and you MUST NOT add it to the public telemetry-events LABEL_MAP.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Test file lives at `src/features/safety/__tests__/telemetryContract.test.ts`.
// __dirname is `src/features/safety/__tests__`; go up 3 = `src/`. Add the
// `src/` prefix in callers to stay consistent with @/ aliases.
const SRC_ROOT = resolve(__dirname, "../../..");

function readProject(rel: string): string {
  return readFileSync(resolve(SRC_ROOT, rel), "utf8");
}

describe("Sprint 36 — telemetry contract (clinical boundary)", () => {
  describe("system 1: log_audit_event for chat safety", () => {
    it("chat.stream.ts writes _action='chat.safety.ed_disclosure' for disclaimer-ed", () => {
      const src = readProject("routes/api/chat.stream.ts");
      // The exact literal in the ED-disclosure block (lines ~148-158).
      expect(src).toMatch(
        /if\s*\(\s*safety\.kind\s*===\s*["']disclaimer-ed["']\s*\)\s*{[\s\S]{0,400}?_action:\s*["']chat\.safety\.ed_disclosure["']/,
      );
    });

    it("chat.stream.ts ED _meta uses ONLY safe keys (no message/text/prompt/user_input)", () => {
      const src = readProject("routes/api/chat.stream.ts");
      // Slice the ED-disclosure branch and check it contains zero unsafe keys.
      const branch = src.match(
        /if\s*\(\s*safety\.kind\s*===\s*["']disclaimer-ed["']\s*\)[\s\S]{0,1000}?log_audit_event[\s\S]{0,800}?\}\s*\)/,
      );
      expect(branch, "could not locate ED-disclosure log_audit_event branch").toBeTruthy();
      const haystack = branch![0].toLowerCase();
      expect(haystack).not.toMatch(/\bmessage\b\s*:/);
      expect(haystack).not.toMatch(/\btext\b\s*:/);
      expect(haystack).not.toMatch(/\bprompt\b\s*:/);
      expect(haystack).not.toMatch(/\buser_input\b\s*:/);
      // Positive-control: safe keys ARE present.
      expect(haystack).toMatch(/message_length/);
      expect(haystack).toMatch(/category/);
    });

    it("audit-log-section.tsx LABEL_MAP exposes chat.safety.ed_disclosure as Indonesian label", () => {
      const src = readProject("features/privacy/components/audit-log-section.tsx");
      expect(src).toMatch(
        /["']chat\.safety\.ed_disclosure["']\s*:\s*{[^}]*label\s*:\s*["'][^"']+["']/,
      );
    });
  });

  describe("system 2: reportSafetyEvent privacy boundary", () => {
    it("safetyTelemetry writes severity='info' so engineering dashboards can roll up", () => {
      const src = readProject("features/safety/lib/safetyTelemetry.ts");
      // Lock the severity choice — flipping to "warning" or "error" would
      // visually leak into clinical alerting routes.
      expect(src).toMatch(/severity\s*:\s*["']info["']/);
    });

    it("safetyTelemetry message NEVER starts with 'event:' (so public telemetry list excludes it)", () => {
      const src = readProject("features/safety/lib/safetyTelemetry.ts");
      // The exact writer line must use "Safety event: " prefix, not "event:".
      expect(src).toMatch(/new\s+Error\s*\(\s*[`"']Safety event:\s*\$\{kind\}[`"']/);
      // Negative-control: must NOT accidentally start with "event:".
      expect(src).not.toMatch(/new\s+Error\s*\(\s*["']event:/);
    });

    it("telemetry-events-section.tsx MUST NOT label any safety.* kind (clinical boundary)", () => {
      const src = readProject("features/privacy/components/telemetry-events-section.tsx");
      // Lock: zero `safety.` keys in the public-facing LABEL_MAP.
      // If a future engineer adds one without psychologist sign-off,
      // this test fails loudly.
      const labelBlock = src.match(/LABEL_MAP\s*:\s*Record<string,\s*string>\s*=\s*{[\s\S]+?\n}/);
      expect(labelBlock, "could not locate LABEL_MAP block").toBeTruthy();
      expect(labelBlock![0]).not.toMatch(/["']safety\./);
      // Positive-control: app-nav telemetry keys ARE present (sanity).
      expect(labelBlock![0]).toMatch(/barcode_grade\.viewed/);
    });
  });
});
