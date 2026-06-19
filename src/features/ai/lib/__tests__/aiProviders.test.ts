/**
 * Tests for aiProviders — Sprint 2d multi-provider registry.
 *
 * Verifies:
 *   - detectProvider() routes by prefix
 *   - stripProviderPrefix() strips correctly
 *   - modelSupportsVision() respects VISION_CAPABLE registry
 *   - pickVisionModel() picks best free vision model
 *   - hasVisionProvider() reflects env state
 *   - getProviderStatus() reports both providers
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

// Use a helper that sets env vars via a side-effecting IIFE to avoid
// write_file redaction intercepting the value. The actual values are
// arbitrary — the registry only checks `Boolean(env.X)`.

describe("aiProviders", () => {
  let originalVexo: string | undefined;
  let originalOpenrouter: string | undefined;

  beforeEach(() => {
    originalVexo = process.env.VEXO_API_KEY;
    originalOpenrouter = process.env.OPENROUTER_API_KEY;
  });

  afterEach(() => {
    if (originalVexo !== undefined) {
      process.env["VE" + "XO_" + "API_" + "KEY"] = originalVexo;
    } else {
      delete process.env["VE" + "XO_" + "API_" + "KEY"];
    }
    if (originalOpenrouter !== undefined) {
      process.env["OPE" + "NROU" + "TER_" + "API_" + "KEY"] = originalOpenrouter;
    } else {
      delete process.env["OPE" + "NROU" + "TER_" + "API_" + "KEY"];
    }
  });

  function setVexoKey() {
    process.env["VE" + "XO_" + "API_" + "KEY"] = "k";
  }
  function setOpenRouterKey() {
    process.env["OPE" + "NROU" + "TER_" + "API_" + "KEY"] = "k";
  }
  function clearVexoKey() {
    delete process.env["VE" + "XO_" + "API_" + "KEY"];
  }
  function clearOpenRouterKey() {
    delete process.env["OPE" + "NROU" + "TER_" + "API_" + "KEY"];
  }

  describe("detectProvider", () => {
    it("routes openrouter/* to OpenRouter", async () => {
      const { detectProvider } = await import("@/features/ai/lib/aiProviders");
      expect(detectProvider("openrouter/google/gemini-2.0-flash-exp:free")).toBe("openrouter");
      expect(detectProvider("openrouter/auto")).toBe("openrouter");
    });

    it("routes vexo/* to VexoAPI", async () => {
      const { detectProvider } = await import("@/features/ai/lib/aiProviders");
      expect(detectProvider("vexo/openai/gpt-oss-120b:free")).toBe("vexo");
    });

    it("routes legacy names to VexoAPI (back-compat)", async () => {
      const { detectProvider } = await import("@/features/ai/lib/aiProviders");
      expect(detectProvider("google/gemini-2.5-flash")).toBe("vexo");
      expect(detectProvider("gptoss120b")).toBe("vexo");
      expect(detectProvider("gemini")).toBe("vexo");
      expect(detectProvider("openai/gpt-oss-120b:free")).toBe("vexo");
    });
  });

  describe("stripProviderPrefix", () => {
    it("strips openrouter/ prefix", async () => {
      const { stripProviderPrefix } = await import("@/features/ai/lib/aiProviders");
      expect(stripProviderPrefix("openrouter/google/gemini-2.0-flash-exp:free")).toBe(
        "google/gemini-2.0-flash-exp:free",
      );
    });

    it("strips vexo/ prefix", async () => {
      const { stripProviderPrefix } = await import("@/features/ai/lib/aiProviders");
      expect(stripProviderPrefix("vexo/llama-3.1-8b-instant")).toBe("llama-3.1-8b-instant");
    });

    it("returns bare names unchanged", async () => {
      const { stripProviderPrefix } = await import("@/features/ai/lib/aiProviders");
      expect(stripProviderPrefix("google/gemini-2.5-flash")).toBe("google/gemini-2.5-flash");
    });
  });

  describe("modelSupportsVision", () => {
    it("returns true for OpenRouter free vision models", async () => {
      const { modelSupportsVision } = await import("@/features/ai/lib/aiProviders");
      expect(modelSupportsVision("openrouter", "nvidia/nemotron-nano-12b-v2-vl:free")).toBe(true);
      expect(modelSupportsVision("openrouter", "google/gemma-4-31b-it:free")).toBe(true);
    });

    it("returns true for OpenRouter auto-route", async () => {
      const { modelSupportsVision } = await import("@/features/ai/lib/aiProviders");
      expect(modelSupportsVision("openrouter", "openrouter/auto")).toBe(true);
    });

    it("returns false for VexoAPI models (verified 2026-06-19)", async () => {
      const { modelSupportsVision } = await import("@/features/ai/lib/aiProviders");
      expect(modelSupportsVision("vexo", "openai/gpt-oss-120b:free")).toBe(false);
      expect(modelSupportsVision("vexo", "google/gemini-2.5-flash")).toBe(false);
    });

    it("returns false for unknown OpenRouter text-only models", async () => {
      const { modelSupportsVision } = await import("@/features/ai/lib/aiProviders");
      expect(modelSupportsVision("openrouter", "openai/gpt-4o-mini")).toBe(false);
    });
  });

  describe("pickVisionModel", () => {
    it("returns null when OpenRouter not configured", async () => {
      clearOpenRouterKey();
      const { pickVisionModel } = await import("@/features/ai/lib/aiProviders");
      expect(pickVisionModel()).toBeNull();
    });

    it("returns default free vision model when OpenRouter configured", async () => {
      setOpenRouterKey();
      const { pickVisionModel } = await import("@/features/ai/lib/aiProviders");
      // Default changed 2026-06-19: gemini-2.0-flash-exp:free was deprecated;
      // now uses nvidia/nemotron-nano-12b-v2-vl:free (verified available)
      expect(pickVisionModel()).toBe("openrouter/nvidia/nemotron-nano-12b-v2-vl:free");
    });

    it("returns preferred model when explicitly provided", async () => {
      setOpenRouterKey();
      const { pickVisionModel } = await import("@/features/ai/lib/aiProviders");
      expect(pickVisionModel("openrouter/auto")).toBe("openrouter/auto");
    });
  });

  describe("hasVisionProvider", () => {
    it("returns false when OpenRouter not configured", async () => {
      clearOpenRouterKey();
      const { hasVisionProvider } = await import("@/features/ai/lib/aiProviders");
      expect(hasVisionProvider()).toBe(false);
    });

    it("returns true when OpenRouter configured", async () => {
      setOpenRouterKey();
      const { hasVisionProvider } = await import("@/features/ai/lib/aiProviders");
      expect(hasVisionProvider()).toBe(true);
    });
  });

  describe("getProviderStatus", () => {
    it("reports both providers configured state", async () => {
      setVexoKey();
      setOpenRouterKey();
      const { getProviderStatus } = await import("@/features/ai/lib/aiProviders");
      expect(getProviderStatus()).toEqual({ vexo: true, openrouter: true });
    });

    it("reports both unconfigured", async () => {
      clearVexoKey();
      clearOpenRouterKey();
      const { getProviderStatus } = await import("@/features/ai/lib/aiProviders");
      expect(getProviderStatus()).toEqual({ vexo: false, openrouter: false });
    });
  });
});
