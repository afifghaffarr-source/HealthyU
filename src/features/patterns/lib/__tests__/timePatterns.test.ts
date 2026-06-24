/**
 * Time Pattern Detection Tests
 *
 * Unit tests for skip_breakfast, late_night_eating, irregular_meals
 */

import { describe, it, expect } from "vitest";
import {
  detectSkipBreakfast,
  detectLateNightEating,
  detectIrregularMeals,
  detectTimePatterns,
  type MealLog,
} from "../timePatterns.server";

describe("Time Pattern Detection", () => {
  describe("detectSkipBreakfast", () => {
    it("detects 5 skipped breakfasts in weekdays", () => {
      const meals: MealLog[] = [
        {
          log_date: "2026-06-16",
          logged_at: "2026-06-16T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Mon skip
        {
          log_date: "2026-06-17",
          logged_at: "2026-06-17T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Tue skip
        {
          log_date: "2026-06-18",
          logged_at: "2026-06-18T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Wed skip
        {
          log_date: "2026-06-19",
          logged_at: "2026-06-19T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Thu skip
        {
          log_date: "2026-06-20",
          logged_at: "2026-06-20T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Fri skip
      ];

      const result = detectSkipBreakfast(meals);

      expect(result.detected).toBe(true);
      expect(result.type).toBe("skip_breakfast");
      expect(result.count).toBeGreaterThanOrEqual(3);
      expect(result.metadata.threshold_applied).toBe(3);
    });

    it("does NOT detect if only 2 skips", () => {
      const meals: MealLog[] = [
        {
          log_date: "2026-06-16",
          logged_at: "2026-06-16T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Mon skip
        {
          log_date: "2026-06-17",
          logged_at: "2026-06-17T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // Tue ok
        {
          log_date: "2026-06-18",
          logged_at: "2026-06-18T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // Wed ok
        {
          log_date: "2026-06-19",
          logged_at: "2026-06-19T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        }, // Thu skip
        {
          log_date: "2026-06-20",
          logged_at: "2026-06-20T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // Fri ok
      ];

      const result = detectSkipBreakfast(meals);

      expect(result.detected).toBe(false);
      expect(result.count).toBeLessThan(3);
      expect(result.metadata.threshold_applied).toBe(3);
    });
  });

  describe("detectLateNightEating", () => {
    it("detects 3+ meals after 10pm", () => {
      const meals: MealLog[] = [
        {
          log_date: "2026-06-10",
          logged_at: "2026-06-10T22:30:00Z",
          meal_type: "snack",
          calories: 400,
          carbs_g: 50,
          protein_g: 10,
          fat_g: 15,
        }, // 10:30pm
        {
          log_date: "2026-06-12",
          logged_at: "2026-06-12T23:00:00Z",
          meal_type: "snack",
          calories: 350,
          carbs_g: 45,
          protein_g: 8,
          fat_g: 12,
        }, // 11pm
        {
          log_date: "2026-06-14",
          logged_at: "2026-06-14T22:15:00Z",
          meal_type: "snack",
          calories: 420,
          carbs_g: 52,
          protein_g: 9,
          fat_g: 14,
        }, // 10:15pm
      ];

      const result = detectLateNightEating(meals);

      expect(result.detected).toBe(true);
      expect(result.type).toBe("late_night_eating");
      expect(result.count).toBe(3);
      expect(result.avg_calories).toBeGreaterThan(0);
      expect(result.metadata.threshold_applied).toBe(3);
    });

    it("does NOT detect if only 2 late meals", () => {
      const meals: MealLog[] = [
        {
          log_date: "2026-06-10",
          logged_at: "2026-06-10T22:30:00Z",
          meal_type: "snack",
          calories: 400,
          carbs_g: 50,
          protein_g: 10,
          fat_g: 15,
        },
        {
          log_date: "2026-06-12",
          logged_at: "2026-06-12T23:00:00Z",
          meal_type: "snack",
          calories: 350,
          carbs_g: 45,
          protein_g: 8,
          fat_g: 12,
        },
      ];

      const result = detectLateNightEating(meals);

      expect(result.detected).toBe(false);
      expect(result.count).toBe(2);
    });
  });

  describe("detectIrregularMeals", () => {
    it("detects irregular meal timing (>3h variance)", () => {
      const meals: MealLog[] = [
        {
          log_date: "2026-06-10",
          logged_at: "2026-06-10T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // 8am
        {
          log_date: "2026-06-11",
          logged_at: "2026-06-11T11:30:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // 11:30am (3.5h diff)
        {
          log_date: "2026-06-12",
          logged_at: "2026-06-12T07:30:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // 7:30am (4h diff from prev)
        {
          log_date: "2026-06-13",
          logged_at: "2026-06-13T10:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        }, // 10am (2.5h diff)
      ];

      const result = detectIrregularMeals(meals);

      expect(result.detected).toBe(true);
      expect(result.type).toBe("irregular_meals");
      expect(result.count).toBeGreaterThanOrEqual(2);
    });

    it("does NOT detect if timing is consistent", () => {
      const meals: MealLog[] = [
        {
          log_date: "2026-06-10",
          logged_at: "2026-06-10T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
        {
          log_date: "2026-06-11",
          logged_at: "2026-06-11T08:15:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
        {
          log_date: "2026-06-12",
          logged_at: "2026-06-12T07:45:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
      ];

      const result = detectIrregularMeals(meals);

      expect(result.detected).toBe(false);
    });
  });

  describe("detectTimePatterns (integration)", () => {
    it("returns only detected patterns", () => {
      const meals: MealLog[] = [
        // Skip breakfast pattern (5 days)
        {
          log_date: "2026-06-16",
          logged_at: "2026-06-16T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        },
        {
          log_date: "2026-06-17",
          logged_at: "2026-06-17T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        },
        {
          log_date: "2026-06-18",
          logged_at: "2026-06-18T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        },
        {
          log_date: "2026-06-19",
          logged_at: "2026-06-19T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        },
        {
          log_date: "2026-06-20",
          logged_at: "2026-06-20T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        },
        // Late night pattern (3 meals)
        {
          log_date: "2026-06-10",
          logged_at: "2026-06-10T22:30:00Z",
          meal_type: "snack",
          calories: 400,
          carbs_g: 50,
          protein_g: 10,
          fat_g: 15,
        },
        {
          log_date: "2026-06-12",
          logged_at: "2026-06-12T23:00:00Z",
          meal_type: "snack",
          calories: 350,
          carbs_g: 45,
          protein_g: 8,
          fat_g: 12,
        },
        {
          log_date: "2026-06-14",
          logged_at: "2026-06-14T22:15:00Z",
          meal_type: "snack",
          calories: 420,
          carbs_g: 52,
          protein_g: 9,
          fat_g: 14,
        },
      ];

      const patterns = detectTimePatterns(meals);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every((p) => p.detected)).toBe(true);

      // Should detect both skip_breakfast and late_night_eating
      const types = patterns.map((p) => p.type);
      expect(types).toContain("skip_breakfast");
      expect(types).toContain("late_night_eating");
    });

    it("returns empty array if no patterns detected", () => {
      // Use recent dates with consistent breakfast logging
      const meals: MealLog[] = [
        {
          log_date: "2026-06-23",
          logged_at: "2026-06-23T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
        {
          log_date: "2026-06-23",
          logged_at: "2026-06-23T12:00:00Z",
          meal_type: "lunch",
          calories: 500,
          carbs_g: 60,
          protein_g: 25,
          fat_g: 15,
        },
        {
          log_date: "2026-06-22",
          logged_at: "2026-06-22T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
        {
          log_date: "2026-06-20",
          logged_at: "2026-06-20T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
        {
          log_date: "2026-06-19",
          logged_at: "2026-06-19T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
        {
          log_date: "2026-06-18",
          logged_at: "2026-06-18T08:00:00Z",
          meal_type: "breakfast",
          calories: 300,
          carbs_g: 40,
          protein_g: 15,
          fat_g: 10,
        },
      ];

      const patterns = detectTimePatterns(meals);

      expect(patterns).toEqual([]);
    });
  });
});
