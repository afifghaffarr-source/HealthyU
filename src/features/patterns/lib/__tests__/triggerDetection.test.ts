/**
 * Pattern Detection Trigger Tests
 * Sprint 10b Phase 4B - E2E tests
 */

import { describe, expect, it, beforeEach, vi } from "vitest";
import { shouldRunDetection, markDetectionRun, triggerIfNeeded } from "../triggerDetection";

interface MockKV {
  get: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
}

interface MockSupabase {
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lt: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
}

describe("Pattern Detection Triggers", () => {
  let mockKV: MockKV;
  let mockSupabase: MockSupabase;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
    };

    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      gte: vi.fn(() => mockSupabase),
      lt: vi.fn(() => mockSupabase),
      is: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
      limit: vi.fn(() => mockSupabase),
      single: vi.fn(),
    };
  });

  describe("shouldRunDetection", () => {
    it("returns true when no cache exists (first run)", async () => {
      mockKV.get.mockResolvedValue(null);

      const result = await shouldRunDetection("user-123", mockKV);

      expect(result).toBe(true);
      expect(mockKV.get).toHaveBeenCalledWith("pattern_last_run:user-123");
    });

    it("returns false when cached < 24h ago", async () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      mockKV.get.mockResolvedValue(twoHoursAgo.toString());

      const result = await shouldRunDetection("user-123", mockKV);

      expect(result).toBe(false);
    });

    it("returns true when cached >= 24h ago", async () => {
      const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;
      mockKV.get.mockResolvedValue(twentyFiveHoursAgo.toString());

      const result = await shouldRunDetection("user-123", mockKV);

      expect(result).toBe(true);
    });
  });

  describe("markDetectionRun", () => {
    it("caches current timestamp with 24h TTL", async () => {
      const beforeTime = Date.now();

      await markDetectionRun("user-123", mockKV);

      const afterTime = Date.now();

      expect(mockKV.put).toHaveBeenCalledTimes(1);
      const [key, value, options] = mockKV.put.mock.calls[0];

      expect(key).toBe("pattern_last_run:user-123");
      const cachedTime = parseInt(value, 10);
      expect(cachedTime).toBeGreaterThanOrEqual(beforeTime);
      expect(cachedTime).toBeLessThanOrEqual(afterTime);
      expect(options).toEqual({ expirationTtl: 86400 });
    });
  });

  describe("triggerIfNeeded", () => {
    it("skips detection when cache is fresh (<24h)", async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      mockKV.get.mockResolvedValue(oneHourAgo.toString());

      const result = await triggerIfNeeded("user-123", mockSupabase, mockKV);

      expect(result).toEqual({
        ran: false,
        patternsFound: 0,
      });
      expect(mockKV.put).not.toHaveBeenCalled();
    });

    it("marks as run even if detection fails (cache updated)", async () => {
      mockKV.get.mockResolvedValue(null); // No cache = should run

      // Trigger will attempt detection, we just verify cache is set
      const result = await triggerIfNeeded("user-123", mockSupabase, mockKV);

      // May succeed or fail depending on real detectPatternsForUser,
      // but cache should be marked regardless
      expect(mockKV.put).toHaveBeenCalledWith("pattern_last_run:user-123", expect.any(String), {
        expirationTtl: 86400,
      });
    });
  });
});
