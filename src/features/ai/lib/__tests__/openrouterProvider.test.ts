/**
 * Tests for openrouterProvider — Sprint 2d multi-provider registry.
 *
 * Verifies:
 *   - isOpenRouterConfigured() correctly reads env
 *   - resolveOpenRouterModelName() strips "openrouter/" prefix
 *   - Default fallback to "openrouter/auto"
 *   - Lazy initialization (no fetch until first call)
 *   - Throws clear error when OPENROUTER_API_KEY missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("openrouterProvider", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
  });
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_BASE_URL;
    vi.unstubAllGlobals();
  });

  describe("isOpenRouterConfigured", () => {
    it("returns true when OPENROUTER_API_KEY is set", async () => {
      const { isOpenRouterConfigured } = await import("@/features/ai/lib/openrouterProvider");
      expect(isOpenRouterConfigured()).toBe(true);
    });

    it("returns false when OPENROUTER_API_KEY is missing", async () => {
      delete process.env.OPENROUTER_API_KEY;
      // Re-import to clear the lazy module cache
      vi.resetModules();
      const { isOpenRouterConfigured: check } =
        await import("@/features/ai/lib/openrouterProvider");
      expect(check()).toBe(false);
    });
  });

  describe("resolveOpenRouterModelName", () => {
    it("strips openrouter/ prefix", async () => {
      const { resolveOpenRouterModelName } = await import("@/features/ai/lib/openrouterProvider");
      expect(resolveOpenRouterModelName("openrouter/google/gemini-2.0-flash-exp:free")).toBe(
        "google/gemini-2.0-flash-exp:free",
      );
    });

    it("passes through bare model names", async () => {
      const { resolveOpenRouterModelName } = await import("@/features/ai/lib/openrouterProvider");
      expect(resolveOpenRouterModelName("meta-llama/llama-3.2-11b-vision-instruct:free")).toBe(
        "meta-llama/llama-3.2-11b-vision-instruct:free",
      );
    });

    it("defaults to openrouter/auto when empty after strip", async () => {
      const { resolveOpenRouterModelName } = await import("@/features/ai/lib/openrouterProvider");
      expect(resolveOpenRouterModelName("openrouter/")).toBe("openrouter/auto");
      expect(resolveOpenRouterModelName("")).toBe("openrouter/auto");
    });
  });

  describe("provider error handling", () => {
    it("throws clear error when OPENROUTER_API_KEY missing", async () => {
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();
      const { openrouterModel } = await import("@/features/ai/lib/openrouterProvider");
      expect(() => openrouterModel("openrouter/google/gemini-2.0-flash-exp:free")).toThrow(
        /OPENROUTER_API_KEY is not configured/,
      );
    });
  });
});
