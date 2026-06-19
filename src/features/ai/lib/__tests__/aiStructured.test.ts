/**
 * Tests for callAiStructured — Vercel AI SDK-based Zod-native output.
 *
 * Strategy: stub global fetch + VEXO_API_KEY env so the SDK's
 * createOpenAICompatible uses our mock. Verify:
 *   - Sends Bearer auth + correct URL
 *   - Parses JSON response as the Zod schema
 *   - Returns fallback on parse failure
 *   - Throws on missing VEXO_API_KEY (rate limit path)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";

describe("callAiStructured", () => {
  // Mock the AI SDK's expected tool-call response format (generateObject
  // with OpenAI-compatible provider uses the `tool` mode by default).
  const mockToolResponse = (args: Record<string, unknown>) =>
    JSON.stringify({
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "json",
                  arguments: JSON.stringify(args),
                },
              },
            ],
          },
          finish_reason: "tool_calls",
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
    });

  beforeEach(() => {
    process.env.VEXO_API_KEY = "VEXO_TEST_KEY";
    process.env.VEXO_BASE_URL = "https://vexoapi.test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(mockToolResponse({ name: "Nasi Goreng", calories: 350 }), {
          status: 200,
        }),
      ),
    );
  });
  afterEach(() => {
    delete process.env.VEXO_API_KEY;
    delete process.env.VEXO_BASE_URL;
    vi.unstubAllGlobals();
  });

  const MealSchema = z.object({
    name: z.string(),
    calories: z.number().int().nonnegative(),
  });

  it("returns parsed object matching the Zod schema", async () => {
    const { callAiStructured } = await import("@/features/ai/lib/aiStructured.functions");
    const result = await callAiStructured({
      userId: null,
      feature: "scan.test",
      prompt: "Estimate: nasi goreng",
      schema: MealSchema,
      schemaName: "Meal",
    });
    expect(result.name).toBe("Nasi Goreng");
    expect(result.calories).toBe(350);
  });

  it("uses default model when not specified", async () => {
    const { callAiStructured } = await import("@/features/ai/lib/aiStructured.functions");
    await callAiStructured({
      userId: null,
      feature: "scan.test",
      prompt: "test",
      schema: MealSchema,
    });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // Default should be gpt-oss-120b:free (mapped from gemini-2.5-flash alias)
    expect(body.model).toBe("openai/gpt-oss-120b:free");
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("test");
  });

  it("uses specified model name (resolved through alias)", async () => {
    const { callAiStructured } = await import("@/features/ai/lib/aiStructured.functions");
    await callAiStructured({
      userId: null,
      feature: "scan.test",
      prompt: "test",
      schema: MealSchema,
      model: "google/gemini-2.5-flash-lite", // → llama-3.1-8b-instant
    });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe("llama-3.1-8b-instant");
  });

  it("includes Bearer auth header from VEXO_API_KEY", async () => {
    const { callAiStructured } = await import("@/features/ai/lib/aiStructured.functions");
    await callAiStructured({
      userId: null,
      feature: "scan.test",
      prompt: "test",
      schema: MealSchema,
    });
    const fetchMock = fetch as ReturnType<typeof vi.fn>;
    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers.Authorization).toBe("Bearer VEXO_TEST_KEY");
  });

  it("throws AiGatewayError 500 when VEXO_API_KEY is missing", async () => {
    delete process.env.VEXO_API_KEY;
    // Reset module cache so the provider is re-initialized without API key.
    vi.resetModules();
    const { callAiStructured } = await import("@/features/ai/lib/aiStructured.functions");
    await expect(
      callAiStructured({
        userId: null,
        feature: "scan.test",
        prompt: "test",
        schema: MealSchema,
      }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("returns fallback when AI returns no tool call", async () => {
    // Empty choices → SDK throws NoObjectGeneratedError → we return fallback.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 })),
    );
    const { callAiStructured } = await import("@/features/ai/lib/aiStructured.functions");
    const result = await callAiStructured({
      userId: null,
      feature: "scan.test",
      prompt: "test",
      schema: MealSchema,
      fallback: { name: "Unknown", calories: 0 },
    });
    expect(result).toEqual({ name: "Unknown", calories: 0 });
  });
});
