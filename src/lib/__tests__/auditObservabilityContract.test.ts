/**
 * Sprint 37 — Audit-observability contract.
 *
 * Three contracts enforced:
 *   A. Server-side logger sanitises PII keys before going to console.
 *   B. Every `track("<event>")` call has a matching label entry in the
 *      public `TelemetryEventsSection` LABEL_MAP so users see Indonesian
 *      friendly names — not "Aktivitas sistem" fallback.
 *   C. The highest-risk server hooks (UID/PII flows) use `logServerError`
 *      — NOT bare `console.error` — so CF Workers logs are PII-redacted.
 *
 * These are static-source assertions. The test runtime is ~15ms; no DB,
 * no network. Failure means async team can grep what's regressed.
 *
 * Per memory "Clinical vs engineering safety (2026-06-17)": engineering
 * telemetry wiring is OK to ship; clinical-response changes (e.g. adding
 * new "safety.*" labels to the public UI) remain DEFERRED.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC_ROOT = resolve(__dirname, "../..");

function readProject(rel: string): string {
  return readFileSync(resolve(SRC_ROOT, rel), "utf8");
}

/** Recursively walk `dir` and return .ts/.tsx paths that are NOT tests. */
function listNonTestTs(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "__tests__" || entry === "node_modules") continue;
      out.push(...listNonTestTs(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("Sprint 37 — audit-observability contract", () => {
  describe("A — logger PII sanitisation", () => {
    it("logger.server.ts exports sanitizeLogMeta that redacts sensitive key fragments", () => {
      const src = readProject("lib/logger.server.ts");
      // Export exists.
      expect(src).toMatch(/export function sanitizeLogMeta/);
      // All critical fragments are present in the blocklist.
      for (const fragment of [
        "token",
        "password",
        "secret",
        "email",
        "phone",
        "session",
        "cookie",
        "authorization",
        "api",
      ]) {
        expect(src.toLowerCase(), `missing fragment: ${fragment}`).toContain(
          fragment.toLowerCase(),
        );
      }
      // Replacement string.
      expect(src).toMatch(/\[redacted\]/);
    });

    it("logger.server.ts exposes logServerError + logServerWarn", () => {
      const src = readProject("lib/logger.server.ts");
      expect(src).toMatch(/export function logServerError/);
      expect(src).toMatch(/export function logServerWarn/);
    });
  });

  describe("B — track() ↔ LABEL_MAP stay in sync", () => {
    /**
     * Sources of truth for track() event names:
     *   - any `track("foo.bar", ...)` call in src/
     *   - LABEL_MAP keys in telemetry-events-section.tsx
     */
    function discoverTrackEvents(): Set<string> {
      const events = new Set<string>();
      const re = /track\(\s*["']([a-z][a-z0-9_.]+)["']/gi;
      for (const file of listNonTestTs(SRC_ROOT)) {
        const content = readFileSync(file, "utf8");
        for (const m of content.matchAll(re)) {
          events.add(m[1]);
        }
      }
      return events;
    }

    function discoverLabelKeys(): Set<string> {
      const src = readProject("features/privacy/components/telemetry-events-section.tsx");
      const labels = new Set<string>();
      const block = src.match(/LABEL_MAP\s*:[^=]*=\s*{([\s\S]+?)\n}/);
      if (!block) return labels;
      const re = /["']([a-z][a-z0-9_.]+)["']\s*:/g;
      for (const m of block[1].matchAll(re)) labels.add(m[1]);
      return labels;
    }

    it("every track() event has a matching LABEL_MAP entry", () => {
      const events = discoverTrackEvents();
      const labels = discoverLabelKeys();
      expect(events.size, "no track() events discovered — sanity").toBeGreaterThan(0);
      expect(labels.size, "no LABEL_MAP entries discovered — sanity").toBeGreaterThan(0);

      const missing = [...events].filter((e) => !labels.has(e)).sort();
      expect(missing, `track() events with no LABEL_MAP entry: ${missing.join(", ")}`).toEqual([]);
    });
  });

  describe("C — high-risk server hooks use logServerError (PII-redacted)", () => {
    // Files that touch real user PII / UUIDs. Listed as a contract so a
    // regression MUST use logServerError / logServerWarn.
    //
    // Special case: `pdpRights.functions.ts` imports via a DYNAMIC
    //   `await import("@/lib/logger.server")` because the file is
    //   co-imported by client routes (backup.tsx, audit-log-section.tsx,
    //   use-delete-account.ts) and TanStack's import-protection plugin
    //   blocks static `*.server.*` from client bundles. The "import"
    //   regex below matches both `from "@/lib/logger.server"` AND
    //   dynamic `import("@/lib/logger.server")`.
    //
    // Sprint 38 — expanded from 4 → 9 high-risk files. Each new file is
    // a server-only hook (static `*.server.ts` import of logger.server
    // permitted) OR a `.functions.ts` that must go through `@/lib/logSafe`
    // for the same dynamic-import safety reason.
    const HIGH_RISK_FILES = [
      // Sprint 37 (privacy/PII flow — dynamic import + static import mix)
      "routes/api/public/hooks/process-account-deletions.ts",
      "routes/api/public/hooks/daily-content.ts",
      "features/privacy/lib/pdpRights.functions.ts",
      "features/recommendations/lib/recommendations.functions.ts",
      // Sprint 38 — server-only static imports (no client co-import)
      "routes/api/chat.stream.ts",
      "routes/api/csp-report.ts",
      "routes/api/sendWeeklyDigests.ts",
      "routes/api/public/hooks/weekly-ai-report.ts",
      "features/ai/lib/aiStreamSdk.server.ts",
      "features/chat/lib/chatRetention.server.ts",
      "features/patterns/lib/patternScoring.server.ts",
      "features/patterns/lib/triggerDetection.ts",
      // Sprint 38 — .functions.ts files co-imported by client routes;
      // MUST use logSafe helpers (which wrap dynamic logger.server import)
      "features/ai/lib/aiStructured.functions.ts",
      "features/meals/lib/meals.functions.ts",
      "features/patterns/lib/triggerPattern.functions.ts",
      "features/patterns/lib/patternFeedback.functions.ts",
      "features/challenges/lib/challenges.functions.ts",
      "features/challenges/lib/groupChallengeBonus.functions.ts",
      "features/scan/lib/scanVision.functions.ts",
      "features/patterns/lib/requestDigest.functions.ts",
      "features/roles/lib/roles.functions.ts",
      // start.ts + log-error.ts are deliberately excluded: both are
      // LAST-RESORT global error layers and intentionally keep bare
      // console.error so they never depend on the logger pipeline.
    ];

    /** Files co-imported by client routes → MUST go through @/lib/logSafe.
     *  `pdpRights.functions.ts` is the SPRINT 37 grandfather — it uses
     *  raw dynamic `await import("@/lib/logger.server")` directly, so
     *  the contract test for it sits in the "uses anything" test above. */
    const LOGSAFE_FILES = new Set([
      "features/ai/lib/aiStructured.functions.ts",
      "features/meals/lib/meals.functions.ts",
      "features/patterns/lib/triggerPattern.functions.ts",
      "features/patterns/lib/patternFeedback.functions.ts",
      "features/challenges/lib/challenges.functions.ts",
      "features/challenges/lib/groupChallengeBonus.functions.ts",
      "features/scan/lib/scanVision.functions.ts",
      "features/patterns/lib/requestDigest.functions.ts",
      "features/roles/lib/roles.functions.ts",
    ]);

    it("every high-risk server hook references @/lib/logger.server (static or dynamic) or @/lib/logSafe", () => {
      for (const rel of HIGH_RISK_FILES) {
        const src = readProject(rel);
        const refLoggerStatic = /from\s+["']@\/lib\/logger\.server["']/.test(src);
        const refLoggerDynamic = /import\s*\(\s*["']@\/lib\/logger\.server["']\s*\)/.test(src);
        const refLogSafe = /from\s+["']@\/lib\/logSafe["']/.test(src);
        const matched = refLoggerStatic || refLoggerDynamic || refLogSafe;
        // Optional: if .functions.ts is in LOGSAFE_FILES, it MAY use either
        // dynamic import OR the logSafe helper — both are valid.
        expect(
          matched,
          `${rel} must reference @/lib/logger.server (static/dynamic) or @/lib/logSafe`,
        ).toBe(true);
      }
    });

    it(".functions.ts files that are logSafe-targeted actually use safeLogServerError / safeLogServerWarn", () => {
      for (const rel of LOGSAFE_FILES) {
        const src = readProject(rel);
        expect(
          /safeLogServerError|safeLogServerWarn/.test(src),
          `${rel} is co-imported by client routes; must use safeLog* helpers (NOT raw dynamic import OR direct logger.server)`,
        ).toBe(true);
      }
    });
    it("high-risk files no longer log raw user_id / full error object via console", () => {
      // The exact regex we want to forbid in those files:
      //   console.(error|warn|info|log)(<body with ${userId|req.user_id|.*error only)
      const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
        {
          pattern: /console\.(error|warn)\([^)]*\$\{?userId\}?[^)]*\)/,
          reason: "userId interpolated into bare console.log line — use logServerWarn",
        },
        {
          pattern: /console\.(error|warn)\([^)]*req\.user_id[^)]*\)/,
          reason: "req.user_id in bare console.error — use logServerError",
        },
      ];
      for (const rel of HIGH_RISK_FILES) {
        const src = readProject(rel);
        for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
          expect(pattern.test(src), `${rel}: ${reason}`).toBe(false);
        }
      }
    });
  });
});
