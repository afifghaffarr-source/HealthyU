/**
 * Safety telemetry — PII-safe by construction.
 *
 * Per project memory "Clinical vs engineering safety (2026-06-17)":
 * engineering telemetry (which keywords fire, which surface, how often)
 * is OK without clinical sign-off. What we MUST NOT do:
 * - Include user message text in the payload (PII + clinical sensitivity).
 * - Auto-implement clinical responses based on telemetry.
 *
 * Safety events are routed through `reportError` with severity="info" so
 * they flow through the existing error_reports table with no new schema.
 * Filter by `context.kind === "safety.*"` server-side to compute metrics.
 */

import { reportError } from "../../../lib/errorReporting";
import type { SafetyCategory, SafetyLevel } from "./medicalSafety";

export type SafetySurface =
  | "chat"
  | "coach"
  | "ocr_nutrition_label"
  | "warung_mode"
  | "meal_plan_swap"
  | "workout_substitute"
  | "daily_tips"
  | "ai_recommendation";

export type SafetyEventKind =
  | "safety.disclaimer_shown"
  | "safety.ed_disclosure_detected"
  | "safety.crisis_detected"
  | "safety.dangerous_behavior_blocked";

export type SafetyEventOptions = {
  surface: SafetySurface;
  level: SafetyLevel;
  category?: SafetyCategory;
  /** When false, the detector fired on AI output (useful for prompt-tuning). */
  triggeredByUserInput?: boolean;
  /** Optional surface-specific detail — e.g. which meal_plan was swapped. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
};

export function reportSafetyEvent(options: SafetyEventOptions): void {
  // Map level → event kind (keeps the public API small).
  const kind: SafetyEventKind =
    options.level === "crisis"
      ? "safety.crisis_detected"
      : options.level === "dangerous"
        ? "safety.dangerous_behavior_blocked"
        : options.level === "ed"
          ? "safety.ed_disclosure_detected"
          : "safety.disclaimer_shown";

  // PII GUARANTEE: never accept a `messageText` field. We strip `meta` to
  // known-safe keys below as a defensive measure.
  const safeMeta = options.meta
    ? Object.fromEntries(
        Object.entries(options.meta).filter(
          ([k]) =>
            !k.toLowerCase().includes("message") &&
            !k.toLowerCase().includes("text") &&
            !k.toLowerCase().includes("prompt") &&
            !k.toLowerCase().includes("user_input"),
        ),
      )
    : undefined;

  reportError(
    new Error(`Safety event: ${kind}`),
    {
      source: "safety",
      boundary: "global",
      kind,
      surface: options.surface,
      level: options.level,
      category: options.category ?? null,
      triggered_by_user_input: options.triggeredByUserInput ?? false,
      meta: safeMeta ?? null,
      route: typeof window !== "undefined" ? window.location.pathname : null,
    },
    {
      severity: "info",
      handled: true,
      mechanism: "manual",
    },
  );
}
