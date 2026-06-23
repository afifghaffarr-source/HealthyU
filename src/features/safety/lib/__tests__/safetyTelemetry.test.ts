/**
 * Tests for safetyTelemetry — PII-safe by construction.
 *
 * Validates:
 * - reportSafetyEvent NEVER includes user message text.
 * - The `meta` filter strips dangerous keys (message/text/prompt/user_input).
 * - Each SafetyLevel maps to the right SafetyEventKind.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportSafetyEvent } from "../safetyTelemetry";

const mockReportError = vi.fn();
vi.mock("../../../../lib/errorReporting", () => ({
  reportError: (err: unknown, ctx: unknown, opts: unknown) => mockReportError(err, ctx, opts),
}));

describe("reportSafetyEvent", () => {
  beforeEach(() => {
    mockReportError.mockReset();
  });

  afterEach(() => {
    mockReportError.mockReset();
  });

  describe("event kind mapping", () => {
    it("crisis level → safety.crisis_detected", () => {
      reportSafetyEvent({ surface: "chat", level: "crisis", category: "crisis" });
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ kind: "safety.crisis_detected" }),
        expect.any(Object),
      );
    });

    it("dangerous level → safety.dangerous_behavior_blocked", () => {
      reportSafetyEvent({
        surface: "ocr_nutrition_label",
        level: "dangerous",
        category: "dangerous_behavior",
      });
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ kind: "safety.dangerous_behavior_blocked" }),
        expect.any(Object),
      );
    });

    it("ed level → safety.ed_disclosure_detected", () => {
      reportSafetyEvent({
        surface: "chat",
        level: "ed",
        category: "eating_disorder",
      });
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ kind: "safety.ed_disclosure_detected" }),
        expect.any(Object),
      );
    });

    it("disclaimer level → safety.disclaimer_shown", () => {
      reportSafetyEvent({
        surface: "coach",
        level: "disclaimer",
        category: "medical_condition",
      });
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ kind: "safety.disclaimer_shown" }),
        expect.any(Object),
      );
    });

    it("safe level → safety.disclaimer_shown (default kind)", () => {
      reportSafetyEvent({ surface: "warung_mode", level: "safe" });
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ kind: "safety.disclaimer_shown" }),
        expect.any(Object),
      );
    });
  });

  describe("PII safety", () => {
    it("never includes message text in payload", () => {
      reportSafetyEvent({
        surface: "chat",
        level: "crisis",
        category: "crisis",
        meta: {
          // Attempted injection — should be stripped:
          message: "aku mau bunuh diri",
          text: "private",
          prompt: "user typed: mati",
          user_input: "secret",
          // Safe meta:
          feature: "chat",
        },
      });
      const call = mockReportError.mock.calls[0];
      const ctx = call[1] as Record<string, unknown>;
      const meta = ctx.meta as Record<string, unknown>;
      expect(meta).not.toHaveProperty("message");
      expect(meta).not.toHaveProperty("text");
      expect(meta).not.toHaveProperty("prompt");
      expect(meta).not.toHaveProperty("user_input");
      expect(meta).toHaveProperty("feature", "chat");
    });

    it("strips case-insensitively (MESSAGE)", () => {
      reportSafetyEvent({
        surface: "chat",
        level: "disclaimer",
        meta: { MESSAGE: "private" },
      });
      const call = mockReportError.mock.calls[0];
      const ctx = call[1] as Record<string, unknown>;
      const meta = ctx.meta as Record<string, unknown>;
      expect(meta).not.toHaveProperty("MESSAGE");
    });
  });

  describe("severity", () => {
    it("uses severity info", () => {
      reportSafetyEvent({ surface: "chat", level: "crisis" });
      expect(mockReportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.objectContaining({ severity: "info", handled: true }),
      );
    });
  });
});
