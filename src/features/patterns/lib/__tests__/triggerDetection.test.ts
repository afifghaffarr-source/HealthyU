/**
 * Pattern Detection Trigger Tests
 * Sprint 10b Phase 4B - E2E tests
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { shouldRunDetection, markDetectionRun, triggerIfNeeded } from "../triggerDetection";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Pattern Detection Triggers", () => {
  let mockSupabase: Partial<SupabaseClient>;

  beforeEach(() => {
    const chainable = {
      from: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      lt: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      single: vi.fn(),
      upsert: vi.fn(),
    };

    // Chain all methods back to chainable
    Object.keys(chainable).forEach((key) => {
      if (key !== "single" && key !== "upsert") {
        (chainable as Record<string, unknown>)[key] = vi.fn(() => chainable);
      }
    });

    mockSupabase = chainable as unknown as Partial<SupabaseClient>;
  });

  describe("shouldRunDetection", () => {
    it("returns true when no record exists (first run)", async () => {
      (mockSupabase.from as ReturnType<typeof vi.fn>)().single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await shouldRunDetection("user-123", mockSupabase as SupabaseClient);

      expect(result).toBe(true);
    });

    it("returns false when last detection < 24h ago", async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      (mockSupabase.from as ReturnType<typeof vi.fn>)().single.mockResolvedValue({
        data: { last_detection_at: twoHoursAgo },
        error: null,
      });

      const result = await shouldRunDetection("user-123", mockSupabase as SupabaseClient);

      expect(result).toBe(false);
    });

    it("returns true when last detection >= 24h ago", async () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      (mockSupabase.from as ReturnType<typeof vi.fn>)().single.mockResolvedValue({
        data: { last_detection_at: twentyFiveHoursAgo },
        error: null,
      });

      const result = await shouldRunDetection("user-123", mockSupabase as SupabaseClient);

      expect(result).toBe(true);
    });
  });

  describe("markDetectionRun", () => {
    it("upserts current timestamp for user", async () => {
      const mockChain = mockSupabase.from as ReturnType<typeof vi.fn>;
      const chain = mockChain();
      chain.upsert.mockResolvedValue({ data: null, error: null });

      await markDetectionRun("user-123", mockSupabase as SupabaseClient);

      expect(chain.upsert).toHaveBeenCalledTimes(1);
      const [insertData, options] = chain.upsert.mock.calls[0];

      expect(insertData.user_id).toBe("user-123");
      expect(insertData.last_detection_at).toBeDefined();
      expect(options).toEqual({ onConflict: "user_id" });
    });
  });

  describe("triggerIfNeeded", () => {
    it("skips detection when last run < 24h", async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      (mockSupabase.from as ReturnType<typeof vi.fn>)().single.mockResolvedValue({
        data: { last_detection_at: oneHourAgo },
        error: null,
      });

      const result = await triggerIfNeeded("user-123", mockSupabase as SupabaseClient);

      expect(result).toEqual({
        ran: false,
        patternsFound: 0,
      });
    });

    it("marks as run even if detection fails", async () => {
      const mockChain = mockSupabase.from as ReturnType<typeof vi.fn>;
      const chain = mockChain();
      chain.single.mockResolvedValue({ data: null, error: null });
      chain.upsert.mockResolvedValue({ data: null, error: null });

      await triggerIfNeeded("user-123", mockSupabase as SupabaseClient);

      // Cooldown should be marked regardless of detection outcome
      expect(chain.upsert).toHaveBeenCalled();
    });
  });
});
