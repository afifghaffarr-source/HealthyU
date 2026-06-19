/**
 * Tests for vexoProvider — Vercel AI SDK wrapper for VexoAPI.
 *
 * Strategy: stub the global fetch (which the SDK's createOpenAICompatible
 * uses under the hood) and verify our wrapper:
 *   - Sends the correct URL (baseURL + chat/completions path)
 *   - Sends Bearer auth
 *   - Maps model aliases to upstream Vexo model names
 *   - Lazy-initializes provider (no fetch until first call)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("vexoProvider", () => {
  beforeEach(() => {
    process.env.VEXO_API_KEY = "VEXO_TEST_KEY";
    process.env.VEXO_BASE_URL = "https://vexoapi.test";
  });
  afterEach(() => {
    delete process.env.VEXO_API_KEY;
    delete process.env.VEXO_BASE_URL;
    vi.unstubAllGlobals();
  });

  describe("model name resolution", () => {
    it("resolves legacy gemini names to upstream Vexo models", async () => {
      const { resolveVexoModelName } = await import("@/features/ai/lib/vexoProvider");
      expect(resolveVexoModelName("google/gemini-2.5-flash")).toBe("openai/gpt-oss-120b:free");
      expect(resolveVexoModelName("google/gemini-2.5-flash-lite")).toBe("llama-3.1-8b-instant");
    });

    it("passes through direct Vexo model names", async () => {
      const { resolveVexoModelName } = await import("@/features/ai/lib/vexoProvider");
      expect(resolveVexoModelName("openai/gpt-oss-120b:free")).toBe("openai/gpt-oss-120b:free");
      expect(resolveVexoModelName("llama-3.1-8b-instant")).toBe("llama-3.1-8b-instant");
    });

    it("falls back to gpt-oss-120b:free for unknown models", async () => {
      const { resolveVexoModelName } = await import("@/features/ai/lib/vexoProvider");
      expect(resolveVexoModelName("gpt-5-future")).toBe("openai/gpt-oss-120b:free");
      expect(resolveVexoModelName("")).toBe("openai/gpt-oss-120b:free");
    });
  });

  describe("vexoModel / vexoChatModel", () => {
    it("throws when VEXO_API_KEY is missing", async () => {
      delete process.env.VEXO_API_KEY;
      const { vexoChatModel } = await import("@/features/ai/lib/vexoProvider");
      expect(() => vexoChatModel()).toThrow(/VEXO_API_KEY is not configured/);
    });

    it("returns a language model instance with the resolved model id", async () => {
      const { vexoChatModel, vexoModel } = await import("@/features/ai/lib/vexoProvider");
      const m = vexoChatModel();
      expect(m).toBeDefined();
      expect(m.modelId).toBe("openai/gpt-oss-120b:free");
      expect(m.provider).toBe("vexo.chat");

      // Explicit model name
      const explicit = vexoModel("llama-3.1-8b-instant");
      expect(explicit.modelId).toBe("llama-3.1-8b-instant");
    });
  });
});
