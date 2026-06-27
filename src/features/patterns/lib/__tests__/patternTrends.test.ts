/**
 * Pattern Trends Tests
 * Sprint 10b - Track improvement over time
 */

import { describe, expect, it } from "vitest";
import { calculateTrend, getTrendEmoji, getTrendColor } from "../patternTrends";
import type { PatternInsight } from "../../types/pattern";

describe("Pattern Trends", () => {
  const basePattern: PatternInsight = {
    id: "test-id",
    user_id: "user-123",
    pattern_type: "skip_breakfast",
    detected_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    resolved_at: null,
    last_occurrence: new Date().toISOString(),
    urgency_score: 75,
    ai_explanation: "Test explanation",
    ai_recommendation: "Test recommendation",
    quick_actions: [],
    occurrence_count: 3,
    baseline_count: 10,
    detection_window_start: "2026-06-10",
    detection_window_end: "2026-06-24",
    analysis_metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_meta: false,
    metapattern_id: null,
    metapattern_components: null,
  };

  describe("calculateTrend", () => {
    it("shows 70% improvement when current=3, baseline=10", () => {
      const trend = calculateTrend(basePattern);

      expect(trend.improvementPercent).toBe(70);
      expect(trend.status).toBe("improving");
      expect(trend.daysTracked).toBe(10);
    });

    it("shows worsening when current > baseline", () => {
      const pattern = { ...basePattern, occurrence_count: 15, baseline_count: 10 };
      const trend = calculateTrend(pattern);

      expect(trend.improvementPercent).toBe(-50);
      expect(trend.status).toBe("worsening");
    });

    it("shows stable when improvement between -20% and +20%", () => {
      const pattern = { ...basePattern, occurrence_count: 9, baseline_count: 10 };
      const trend = calculateTrend(pattern);

      expect(trend.improvementPercent).toBe(10);
      expect(trend.status).toBe("stable");
    });

    it("handles baseline=0 gracefully", () => {
      const pattern = { ...basePattern, occurrence_count: 5, baseline_count: 0 };
      const trend = calculateTrend(pattern);

      expect(trend.improvementPercent).toBe(0);
      expect(trend.status).toBe("stable");
    });

    it("calculates days tracked from detected_at", () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const pattern = { ...basePattern, detected_at: fiveDaysAgo };
      const trend = calculateTrend(pattern);

      expect(trend.daysTracked).toBe(5);
    });
  });

  describe("getTrendEmoji", () => {
    it("returns correct emoji for each status", () => {
      expect(getTrendEmoji("improving")).toBe("📈");
      expect(getTrendEmoji("worsening")).toBe("📉");
      expect(getTrendEmoji("stable")).toBe("➡️");
    });
  });

  describe("getTrendColor", () => {
    it("returns correct Tailwind class for each status", () => {
      expect(getTrendColor("improving")).toBe("text-green-600");
      expect(getTrendColor("worsening")).toBe("text-red-600");
      expect(getTrendColor("stable")).toBe("text-gray-600");
    });
  });
});
