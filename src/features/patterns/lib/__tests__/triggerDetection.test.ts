/**
 * Pattern Detection Trigger Tests
 * Sprint 10b Phase 4B - E2E tests
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { shouldRunDetection, markDetectionRun, triggerIfNeeded } from "../triggerDetection";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("Pattern Detection Triggers", () => {
  let mockSupabase: SupabaseClient;

  beforeEach(() => {
    const mockFrom = vi.fn();
    const mockSelect = vi.fn();
    const mockEq = vi.fn();
    const mockSingle = vi.fn();
    const mockUpsert = vi.fn();

    // Chain: from().select().eq().single()
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      upsert: mockUpsert,
    });

    mockSupabase = { from: mockFrom } as unknown as SupabaseClient;
  });

  describe("shouldRunDetection", () => {
    it("returns true when no record exists (first run)", async () => {
      const mockFrom = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
      mockFrom().select().eq().single.mockResolvedValue({ data: null, error: null });

      const result = await shouldRunDetection("user-123", mockSupabase);

      expect(result).toBe(true);
    });

    it("returns false when last detection < 24h ago", async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const mockFrom = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
      mockFrom()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { last_detection_at: twoHoursAgo },
          error: null,
        });

      const result = await shouldRunDetection("user-123", mockSupabase);

      expect(result).toBe(false);
    });

    it("returns true when last detection >= 24h ago", async () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      const mockFrom = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
      mockFrom()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { last_detection_at: twentyFiveHoursAgo },
          error: null,
        });

      const result = await shouldRunDetection("user-123", mockSupabase);

      expect(result).toBe(true);
    });
  });

  describe("markDetectionRun", () => {
    it("upserts current timestamp for user", async () => {
      const mockFrom = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      await markDetectionRun("user-123", mockSupabase);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const [insertData, options] = mockUpsert.mock.calls[0];

      expect(insertData.user_id).toBe("user-123");
      expect(insertData.last_detection_at).toBeDefined();
      expect(options).toEqual({ onConflict: "user_id" });
    });
  });

  describe("triggerIfNeeded", () => {
    it("skips detection when last run < 24h", async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const mockFrom = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
      mockFrom()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { last_detection_at: oneHourAgo },
          error: null,
        });

      const result = await triggerIfNeeded("user-123", mockSupabase);

      expect(result).toEqual({
        ran: false,
        patternsFound: 0,
      });
    });

    it("marks as run even if detection fails", async () => {
      const mockFrom = mockSupabase.from as unknown as ReturnType<typeof vi.fn>;
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null });

      // First call: shouldRunDetection (select chain)
      mockFrom().select().eq().single.mockResolvedValue({ data: null, error: null });
      // Second call: markDetectionRun (upsert)
      mockFrom.mockReturnValue({ upsert: mockUpsert });

      await triggerIfNeeded("user-123", mockSupabase);

      // Cooldown should be marked regardless of detection outcome
      expect(mockUpsert).toHaveBeenCalled();
    });
  });
});
