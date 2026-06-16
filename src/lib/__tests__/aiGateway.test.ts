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
import { withMockedEnv } from "../cloudflare-env.server";

const origKey = process.env.VEXO_API_KEY;
const origFetch = globalThis.fetch;

function mkFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

beforeEach(() => {
  process.env.VEXO_API_KEY = "test-key";
  enforceMock.mockReset();
  logMock.mockReset();
  enforceMock.mockResolvedValue({ allowed: true });
});

afterEach(() => {
  if (origKey === undefined) delete process.env.VEXO_API_KEY;
  else process.env.VEXO_API_KEY = origKey;
  globalThis.fetch = origFetch;
});

const msgs = [{ role: "user" as const, content: "hi" }];

/**
 * VexoAPI (new OpenAI-compatible endpoint) returns
 * { id, object, model, choices: [{ message: { content } }] }.
 */
function vexoResponse(content: string, init?: ResponseInit) {
  return new Response(
    JSON.stringify({
      id: "test-id",
      object: "chat.completion",
      model: "openai/gpt-oss-120b:free",
      choices: [{ index: 0, message: { role: "assistant", content } }],
    }),
    { status: 200, ...init },
  );
}

describe("callAiWithGuards", () => {
  it("fails closed when VEXO_API_KEY missing", async () => {
    delete process.env.VEXO_API_KEY;
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toBeInstanceOf(AiGatewayError);
  });

  // New env pattern: withMockedEnv sets a CF env context. This is the
  // production-style mock; the other tests use process.env for legacy compat.
  // Note: withMockedEnv merges process.env (production-like behavior), so
  // passing {} does NOT clear VEXO_API_KEY=test-key set by beforeEach. We
  // must explicitly override the key to undefined to exercise the
  // "missing key → fail closed" path. This mirrors production where the
  // CF Workers env overrides build-time-injected values.
  it("fails closed when VEXO_API_KEY missing in withMockedEnv", async () => {
    await expect(
      withMockedEnv({ VEXO_API_KEY: undefined as unknown as string }, () =>
        callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
      ),
    ).rejects.toBeInstanceOf(AiGatewayError);
  });

  it("succeeds when VEXO_API_KEY is in withMockedEnv", async () => {
    mkFetch(async () => vexoResponse("ok"));
    const out = await withMockedEnv({ VEXO_API_KEY: "test-key" }, () =>
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    );
    expect(out).toBe("ok");
  });

  it("returns string content + logs estimated usage on success", async () => {
    mkFetch(async () => vexoResponse("hello"));
    const out = await callAiWithGuards({
      userId: "u1",
      feature: "chat",
      messages: msgs,
    });
    expect(out).toBe("hello");
    expect(logMock).toHaveBeenCalledTimes(1);
    // Token counts are estimated from char length (VexoAPI doesn't surface usage)
    const logged = logMock.mock.calls[0][0];
    expect(logged.userId).toBe("u1");
    expect(logged.feature).toBe("chat");
    expect(logged.promptTokens).toBeGreaterThan(0);
    expect(logged.completionTokens).toBeGreaterThan(0);
  });

  it("unwraps OpenAI choices[0].message.content response", async () => {
    mkFetch(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "from-choices-field" } }],
          }),
          { status: 200 },
        ),
    );
    const out = await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: msgs,
    });
    expect(out).toBe("from-choices-field");
  });

  it("sends POST to /api/v1/chat/completions with Bearer auth", async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    let capturedHeaders: Record<string, string> | undefined;
    let capturedBody: string | undefined;
    mkFetch(async (input, init) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      capturedMethod = init?.method ?? "GET";
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = init?.body as string;
      return vexoResponse("ok");
    });
    await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: [{ role: "user", content: "ping" }],
    });
    expect(capturedMethod).toBe("POST");
    expect(capturedUrl).toBe("https://vexoapi.dev/api/v1/chat/completions");
    expect(capturedHeaders?.["Authorization"]).toBe("Bearer test-key");
    expect(capturedHeaders?.["Content-Type"]).toBe("application/json");
    const body = JSON.parse(capturedBody ?? "{}");
    expect(body.model).toBe("openai/gpt-oss-120b:free");
    expect(body.messages).toEqual([{ role: "user", content: "ping" }]);
    expect(body.stream).toBe(false);
  });

  it("maps 429 to AiGatewayError(429)", async () => {
    mkFetch(async () => new Response("", { status: 429 }));
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

  it("maps 403 (upstream denied) to AiGatewayError(503)", async () => {
    // VexoAPI returns 403 when upstream model provider is denying access.
    // We surface this as 503 so callers know it's a transient infra issue.
    mkFetch(async () => new Response("", { status: 403 }));
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toMatchObject({ status: 503 });
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

  it("treats {status: false} envelope as error", async () => {
    mkFetch(
      async () =>
        new Response(JSON.stringify({ status: false, error: "upstream denied" }), { status: 200 }),
    );
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toBeInstanceOf(AiGatewayError);
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
    mkFetch(async () => vexoResponse("x"));
    await callAiWithGuards({ userId: "u1", feature: "f", messages: msgs, skipBudget: true });
    expect(enforceMock).not.toHaveBeenCalled();
  });

  it("JSON mode appends hint to text and routes to JSON-extractable response", async () => {
    let capturedBody: string | undefined;
    mkFetch(async (_input, init) => {
      capturedBody = init?.body as string;
      return vexoResponse('{"a":1}');
    });
    await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: msgs,
      responseFormat: "json_object",
    });
    // Hint should be appended to the user message in the request body.
    const body = JSON.parse(capturedBody ?? "{}");
    const userMessage = body.messages.find((m: { role: string }) => m.role === "user");
    expect(userMessage.content).toContain("Respond with valid JSON");
  });
});

describe("callAiJsonWithGuards", () => {
  it("parses JSON content", async () => {
    mkFetch(async () => vexoResponse('{"a":1}'));
    const out = await callAiJsonWithGuards<{ a: number }>({
      userId: null,
      feature: "f",
      messages: msgs,
    });
    expect(out).toEqual({ a: 1 });
  });
  it("returns {} on parse failure", async () => {
    mkFetch(async () => vexoResponse("not json"));
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
    mkFetch(async () => vexoResponse('{"a":1}'));
    const out = await callAiJsonWithSchema({ userId: null, feature: "f", messages: msgs, schema });
    expect(out).toEqual({ a: 1 });
  });
  it("returns fallback on invalid JSON", async () => {
    mkFetch(async () => vexoResponse("garbage"));
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
    mkFetch(async () => vexoResponse('{"a":"nope"}'));
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
    mkFetch(async () => vexoResponse("garbage"));
    await expect(
      callAiJsonWithSchema({ userId: null, feature: "f", messages: msgs, schema }),
    ).rejects.toBeInstanceOf(AiSchemaError);
  });
});
