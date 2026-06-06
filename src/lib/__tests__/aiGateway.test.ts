import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const enforceMock = vi.fn();
const logMock = vi.fn();
vi.mock("@/features/ai/lib/aiBudget.server", () => ({
  enforceAiBudget: (...a: unknown[]) => enforceMock(...a),
  logAiUsage: (...a: unknown[]) => logMock(...a),
}));

import { z } from "zod";
import {
  callAiWithGuards,
  callAiJsonWithGuards,
  callAiJsonWithSchema,
  extractJsonFromResponse,
  AiGatewayError,
  AiSchemaError,
} from "@/features/ai/lib/aiGateway.server";

const origKey = process.env.GEMINI_API_KEY;
const origFetch = globalThis.fetch;

function mkFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  enforceMock.mockReset();
  logMock.mockReset();
  enforceMock.mockResolvedValue({ allowed: true });
});
afterEach(() => {
  process.env.GEMINI_API_KEY = origKey;
  globalThis.fetch = origFetch;
});

const msgs = [{ role: "user" as const, content: "hi" }];

describe("callAiWithGuards", () => {
  it("fails closed when API key missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toBeInstanceOf(AiGatewayError);
  });

  it("returns content + logs usage on success", async () => {
    mkFetch(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "hello" } }],
            usage: { prompt_tokens: 5, completion_tokens: 3 },
          }),
          { status: 200 },
        ),
    );
    const out = await callAiWithGuards({ userId: "u1", feature: "chat", messages: msgs });
    expect(out).toBe("hello");
    expect(logMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        feature: "chat",
        promptTokens: 5,
        completionTokens: 3,
      }),
    );
  });

  it("sends max_tokens and response_format when provided", async () => {
    let captured: { max_tokens?: number; response_format?: { type: string } } | undefined;
    mkFetch(async (_url, init) => {
      captured = JSON.parse(init!.body as string);
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
        status: 200,
      });
    });
    await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: msgs,
      maxTokens: 99,
      responseFormat: "json_object",
    });
    expect(captured!.max_tokens).toBe(99);
    expect(captured!.response_format).toEqual({ type: "json_object" });
  });

  it("maps 429 to AiGatewayError(429)", async () => {
    mkFetch(async () => new Response("rl", { status: 429 }));
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("maps 402 to AiGatewayError(402)", async () => {
    mkFetch(async () => new Response("", { status: 402 }));
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("maps non-ok to AiGatewayError with status", async () => {
    mkFetch(async () => new Response("boom", { status: 500 }));
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 500 });
  });

  it("maps abort/timeout to 504", async () => {
    mkFetch(async (_url, init) => {
      await new Promise((_, rej) => {
        init!.signal!.addEventListener("abort", () => {
          const e = new Error("aborted");
          e.name = "AbortError";
          rej(e);
        });
      });
      return new Response("");
    });
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs, timeoutMs: 5 }),
    ).rejects.toMatchObject({ status: 504 });
  });

  it("maps generic fetch error to 502", async () => {
    mkFetch(async () => {
      throw new Error("net down");
    });
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it("blocks via budget rate_hour as 429", async () => {
    enforceMock.mockResolvedValue({ allowed: false, reason: "rate_hour" });
    await expect(
      callAiWithGuards({ userId: "u1", feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 429, message: expect.stringContaining("jam") });
  });

  it("blocks via budget token_day as 429 with daily message", async () => {
    enforceMock.mockResolvedValue({ allowed: false, reason: "token_day" });
    await expect(
      callAiWithGuards({ userId: "u1", feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 429, message: expect.stringContaining("harian") });
  });

  it("skipBudget bypasses enforceAiBudget", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "x" } }] }), { status: 200 }),
    );
    await callAiWithGuards({ userId: "u1", feature: "f", messages: msgs, skipBudget: true });
    expect(enforceMock).not.toHaveBeenCalled();
  });
});

describe("callAiJsonWithGuards", () => {
  it("parses JSON content", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), {
          status: 200,
        }),
    );
    const out = await callAiJsonWithGuards<{ a: number }>({
      userId: null,
      feature: "f",
      messages: msgs,
    });
    expect(out).toEqual({ a: 1 });
  });
  it("returns {} on parse failure", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "not json" } }] }), {
          status: 200,
        }),
    );
    const out = await callAiJsonWithGuards({ userId: null, feature: "f", messages: msgs });
    expect(out).toEqual({});
  });
});

describe("extractJsonFromResponse", () => {
  it("strips ```json fences", () => {
    expect(extractJsonFromResponse('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("pulls first balanced object from prose", () => {
    expect(extractJsonFromResponse('here ya go: {"a":{"b":2}} thanks')).toBe('{"a":{"b":2}}');
  });
  it("handles arrays", () => {
    expect(extractJsonFromResponse("prefix [1,2,3] suffix")).toBe("[1,2,3]");
  });
  it("ignores braces inside strings", () => {
    expect(extractJsonFromResponse('{"s":"a}b"}')).toBe('{"s":"a}b"}');
  });
});

describe("callAiJsonWithSchema", () => {
  const schema = z.object({ a: z.number() });
  it("validates and returns typed data", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), {
          status: 200,
        }),
    );
    const out = await callAiJsonWithSchema({ userId: null, feature: "f", messages: msgs, schema });
    expect(out).toEqual({ a: 1 });
  });
  it("returns fallback on invalid JSON", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "garbage" } }] }), {
          status: 200,
        }),
    );
    const out = await callAiJsonWithSchema({
      userId: null,
      feature: "f",
      messages: msgs,
      schema,
      fallback: { a: 0 },
    });
    expect(out).toEqual({ a: 0 });
  });
  it("returns fallback on schema mismatch", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: '{"a":"nope"}' } }] }), {
          status: 200,
        }),
    );
    const out = await callAiJsonWithSchema({
      userId: null,
      feature: "f",
      messages: msgs,
      schema,
      fallback: { a: -1 },
    });
    expect(out).toEqual({ a: -1 });
  });
  it("throws AiSchemaError without fallback on invalid JSON", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: "garbage" } }] }), {
          status: 200,
        }),
    );
    await expect(
      callAiJsonWithSchema({ userId: null, feature: "f", messages: msgs, schema }),
    ).rejects.toBeInstanceOf(AiSchemaError);
  });
  it("forwards default max_tokens=2048", async () => {
    let captured: { max_tokens?: number } | undefined;
    mkFetch(async (_u, init) => {
      captured = JSON.parse(init!.body as string);
      return new Response(JSON.stringify({ choices: [{ message: { content: '{"a":1}' } }] }), {
        status: 200,
      });
    });
    await callAiJsonWithSchema({ userId: null, feature: "f", messages: msgs, schema });
    expect(captured!.max_tokens).toBe(2048);
  });
});
