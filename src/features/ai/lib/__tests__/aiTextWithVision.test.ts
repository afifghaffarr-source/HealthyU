import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the providers so we can test routing logic without hitting real APIs.
vi.mock("@/features/ai/lib/vexoProvider", () => ({
  vexoModel: vi.fn(() => ({ mockVe: true })),
  isVexoConfigured: vi.fn(() => true),
  resolveVexoModelName: vi.fn((m: string) => m),
}));
vi.mock("@/features/ai/lib/openrouterProvider", () => ({
  openrouterModel: vi.fn(() => ({ mockOr: true })),
  isOpenRouterConfigured: vi.fn(() => true),
  resolveOpenRouterModelName: vi.fn((m: string) =>
    m.startsWith("openrouter/") ? m.slice("openrouter/".length) : m,
  ),
}));
vi.mock("@/lib/cloudflare-env.server", () => ({
  getEnv: vi.fn(() => ({
    VEXO_API_KEY: "test-vexo",
    OPENROUTER_API_KEY: "test-or",
  })),
}));

// Mock the Vercel AI SDK so generateText is observable and controllable.
vi.mock("ai", () => ({
  generateText: vi.fn(async (opts: unknown) => {
    // Echo back the model + last user text so we can verify routing.
    const o = opts as {
      model: { mockOr?: boolean; mockVe?: boolean };
      messages: Array<{ role: string; content: unknown }>;
    };
    const last = o.messages[o.messages.length - 1];
    const text = typeof last?.content === "string" ? last.content : "vision-response";
    const provider = o.model.mockOr ? "openrouter" : o.model.mockVe ? "vexo" : "unknown";
    return { text: `[${provider}:${text}]` };
  }),
}));

import { callAiTextWithVision } from "@/features/ai/lib/aiProviders";

describe("callAiTextWithVision — Sprint 2d follow-up", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes text-only messages through VexoAPI", async () => {
    const r = await callAiTextWithVision({
      feature: "chat.test",
      messages: [{ role: "user", content: "halo" }],
      preferredModel: "google/gemini-2.5-flash",
    });
    expect(r.text).toBe("[vexo:halo]");
    expect(r.mode).toBe("vexo-text");
  });

  it("routes image + OpenRouter configured → vision mode", async () => {
    const r = await callAiTextWithVision({
      feature: "chat.image.test",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "apa ini?" },
            { type: "image", image: "data:image/png;base64,AAA" },
          ],
        },
      ],
    });
    expect(r.text).toMatch(/\[openrouter:/);
    expect(r.mode).toBe("openrouter-vision");
  });

  it("falls back to text-only when image but no OpenRouter", async () => {
    const { isOpenRouterConfigured } = await import("@/features/ai/lib/openrouterProvider");
    vi.mocked(isOpenRouterConfigured).mockReturnValueOnce(false);
    const r = await callAiTextWithVision({
      feature: "chat.image.no-or",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "apa ini?" },
            { type: "image", image: "data:image/png;base64,AAA" },
          ],
        },
      ],
    });
    // Image stripped → text-only via Vexo
    expect(r.text).toMatch(/\[vexo:/);
    expect(r.mode).toBe("fallback-text");
  });

  it("respects explicit openrouter/ text-only model", async () => {
    const r = await callAiTextWithVision({
      feature: "chat.text.or",
      messages: [{ role: "user", content: "halo" }],
      preferredModel: "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    });
    expect(r.mode).toBe("openrouter-text");
    expect(r.text).toMatch(/openrouter/);
  });

  it("returns empty when all providers fail", async () => {
    const { generateText } = await import("ai");
    vi.mocked(generateText).mockRejectedValueOnce(new Error("boom"));
    const r = await callAiTextWithVision({
      feature: "chat.fail",
      messages: [{ role: "user", content: "halo" }],
    });
    expect(r.text).toBe("");
    expect(r.mode).toBe("fallback-empty");
  });
});
