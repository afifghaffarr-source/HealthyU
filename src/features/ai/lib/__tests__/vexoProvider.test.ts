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
    // resetModules ensures the lazy-initialized `_provider` in vexoProvider.ts
    // is rebuilt each test, so env var changes actually take effect.
    vi.resetModules();
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

  /**
   * REGRESSION (Sprint 6 fix): Vercel AI SDK hardcodes the chat completions
   * path as `${baseURL}/chat/completions`. VexoAPI serves that path under
   * `/api/v1/`, so the provider must append the `/api/v1` prefix itself.
   *
   * Before the fix: SDK hit `https://vexoapi.site/chat/completions` → 404
   * (parking page) → silent catch → user got empty AI reply in chat.
   *
   * After the fix: SDK hits `https://vexoapi.site/api/v1/chat/completions`
   * → 200 OK → real AI reply.
   *
   * We verify by stubbing fetch and asserting the exact request URL.
   */
  describe("baseURL suffix (regression: 2026-06-19 chat empty bug)", () => {
    it("hits /api/v1/chat/completions (not /chat/completions) on generateText", async () => {
      const calls: Array<{ url: string; init?: RequestInit }> = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
          const u = typeof url === "string" ? url : url.toString();
          calls.push({ url: u, init });
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: "OK" } }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }),
      );

      const { generateText } = await import("ai");
      const { vexoModel } = await import("@/features/ai/lib/vexoProvider");
      await generateText({ model: vexoModel("gptoss120b"), prompt: "halo" });

      expect(calls).toHaveLength(1);
      const reqUrl = calls[0].url;
      // The URL must be the full /api/v1/chat/completions path
      expect(reqUrl).toBe("https://vexoapi.test/api/v1/chat/completions");
      // It must contain the /api/v1/ prefix (pre-fix it was just
      // /chat/completions without the prefix, which 404'd)
      expect(reqUrl).toContain("/api/v1/chat/completions");
      // The Authorization header must be present and well-formed
      const headers = (calls[0].init?.headers ?? {}) as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer VEXO_TEST_KEY");
    });

    it("strips trailing slash from baseURL before appending /api/v1", async () => {
      process.env.VEXO_BASE_URL = "https://vexoapi.test/"; // trailing slash
      const calls: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          calls.push(typeof url === "string" ? url : url.toString());
          return new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      const { generateText } = await import("ai");
      const { vexoModel } = await import("@/features/ai/lib/vexoProvider");
      await generateText({ model: vexoModel("gptoss120b"), prompt: "x" });

      // Trailing slash must be stripped; otherwise we'd get //api/v1/
      expect(calls[0]).toBe("https://vexoapi.test/api/v1/chat/completions");
    });

    it("handles multiple trailing slashes defensively", async () => {
      process.env.VEXO_BASE_URL = "https://vexoapi.test///";
      const calls: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          calls.push(typeof url === "string" ? url : url.toString());
          return new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      const { generateText } = await import("ai");
      const { vexoModel } = await import("@/features/ai/lib/vexoProvider");
      await generateText({ model: vexoModel("gptoss120b"), prompt: "x" });

      // All trailing slashes must be stripped
      expect(calls[0]).toBe("https://vexoapi.test/api/v1/chat/completions");
    });

    it("uses default VexoAPI host when VEXO_BASE_URL is unset", async () => {
      delete process.env.VEXO_BASE_URL;
      const calls: string[] = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string | URL) => {
          calls.push(typeof url === "string" ? url : url.toString());
          return new Response(JSON.stringify({ choices: [{ message: { content: "OK" } }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }),
      );

      const { generateText } = await import("ai");
      const { vexoModel } = await import("@/features/ai/lib/vexoProvider");
      await generateText({ model: vexoModel("gptoss120b"), prompt: "x" });

      expect(calls[0]).toBe("https://vexoapi.site/api/v1/chat/completions");
    });
  });
});
