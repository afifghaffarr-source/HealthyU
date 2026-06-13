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

const origKey = process.env.VEXO_API_KEY;
const origFetch = globalThis.fetch;

function mkFetch(
  impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) {
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
 * VexoAPI returns { status, data, timestamp } where data is a string
 * (or an object with result/text/response/output fields).
 */
function vexoResponse(data: string | object, init?: ResponseInit) {
  return new Response(JSON.stringify({ status: true, data, timestamp: "x" }), {
    status: 200,
    ...init,
  });
}

describe("callAiWithGuards", () => {
  it("fails closed when VEXO_API_KEY missing", async () => {
    delete process.env.VEXO_API_KEY;
    await expect(
      callAiWithGuards({ userId: null, feature: "f", messages: msgs }),
    ).rejects.toBeInstanceOf(AiGatewayError);
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

  it("unwraps {data: {result: '...'}} response shape", async () => {
    mkFetch(async () => vexoResponse({ result: "from-result-field" }));
    const out = await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: msgs,
    });
    expect(out).toBe("from-result-field");
  });

  it("sends a GET to vexoapi.dev with ?key=&text= query params", async () => {
    let capturedUrl: string | undefined;
    let capturedMethod: string | undefined;
    mkFetch(async (input, init) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      capturedMethod = init?.method ?? "GET";
      return vexoResponse("ok");
    });
    await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: [{ role: "user", content: "ping" }],
    });
    expect(capturedMethod).toBe("GET");
    expect(capturedUrl).toContain("https://vexoapi.dev/api/");
    expect(capturedUrl).toContain("key=test-key");
    expect(decodeURIComponent(capturedUrl ?? "")).toContain("ping");
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
    mkFetch(async () =>
      new Response(
        JSON.stringify({ status: false, error: "upstream denied" }),
        { status: 200 },
      ),
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
    let capturedUrl: string | undefined;
    mkFetch(async (input) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      return vexoResponse('{"a":1}');
    });
    await callAiWithGuards({
      userId: null,
      feature: "f",
      messages: msgs,
      responseFormat: "json_object",
    });
    // Hint should be appended to the prompt (URL-encoded + is space in
    // query strings; URLSearchParams parses it correctly for us).
    const url = new URL(capturedUrl ?? "");
    const text = url.searchParams.get("text") ?? "";
    expect(text).toContain("Respond with valid JSON");
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
