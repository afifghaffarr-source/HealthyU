import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  callVexoApi,
  endpointSupportsImage,
  flattenMessages,
  MAX_SYSTEM_CHARS,
  MAX_TEXT_CHARS,
  resolveVexoEndpoint,
  VexoApiCallError,
} from "@/features/ai/lib/vexoAdapter.server";

describe("flattenMessages", () => {
  it("returns empty system when only user text", () => {
    const out = flattenMessages([{ role: "user", content: "halo" }]);
    expect(out.text).toBe("halo");
    expect(out.system).toBe("");
    expect(out.imageUrl).toBeUndefined();
  });

  it("joins system messages with double newline", () => {
    const out = flattenMessages([
      { role: "system", content: "kamu adalah ahli gizi" },
      { role: "user", content: "apa itu protein?" },
    ]);
    expect(out.system).toBe("kamu adalah ahli gizi");
    expect(out.text).toBe("apa itu protein?");
  });

  it("concatenates multiple system messages", () => {
    const out = flattenMessages([
      { role: "system", content: "aturan 1" },
      { role: "system", content: "aturan 2" },
      { role: "user", content: "ok" },
    ]);
    expect(out.system).toBe("aturan 1\n\naturan 2");
  });

  it("preserves last user as text, older as history", () => {
    const out = flattenMessages([
      { role: "user", content: "pertanyaan 1" },
      { role: "assistant", content: "jawaban 1" },
      { role: "user", content: "pertanyaan 2" },
    ]);
    expect(out.text).toBe("[user] pertanyaan 1\n[assistant] jawaban 1\n[user] pertanyaan 2");
  });

  it("extracts imageUrl from last user image_url part", () => {
    const out = flattenMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "apa ini?" },
          { type: "image_url", image_url: { url: "https://x.com/y.jpg" } },
        ],
      },
    ]);
    expect(out.text).toBe("apa ini?");
    expect(out.imageUrl).toBe("https://x.com/y.jpg");
  });
});

describe("resolveVexoEndpoint", () => {
  it("maps legacy gemini names to current Vexo model names", () => {
    expect(resolveVexoEndpoint("google/gemini-2.5-flash")).toBe("openai/gpt-oss-120b:free");
    expect(resolveVexoEndpoint("google/gemini-2.5-flash-lite")).toBe("llama-3.1-8b-instant");
    expect(resolveVexoEndpoint("google/gemini-2.5-pro")).toBe("qwen/qwen3-32b");
  });
  it("passes through new Vexo model names", () => {
    expect(resolveVexoEndpoint("openai/gpt-oss-120b:free")).toBe("openai/gpt-oss-120b:free");
    expect(resolveVexoEndpoint("llama-3.1-8b-instant")).toBe("llama-3.1-8b-instant");
    expect(resolveVexoEndpoint("qwen/qwen3-32b")).toBe("qwen/qwen3-32b");
  });
  it("falls back to gpt-oss-120b:free for unknown models", () => {
    expect(resolveVexoEndpoint("gpt-5")).toBe("openai/gpt-oss-120b:free");
    expect(resolveVexoEndpoint("")).toBe("openai/gpt-oss-120b:free");
  });
  it("still supports legacy short names for back-compat", () => {
    expect(resolveVexoEndpoint("gptoss120b")).toBe("openai/gpt-oss-120b:free");
    expect(resolveVexoEndpoint("glm47flash")).toBe("llama-3.1-8b-instant");
  });
});

describe("endpointSupportsImage", () => {
  it("returns false for all current free models (no vision)", () => {
    expect(endpointSupportsImage("openai/gpt-oss-120b:free")).toBe(false);
    expect(endpointSupportsImage("llama-3.1-8b-instant")).toBe(false);
    expect(endpointSupportsImage("qwen/qwen3-32b")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// callVexoApi — input validation, retries, error mapping
// ──────────────────────────────────────────────────────────────────────

describe("callVexoApi — input validation", () => {
  beforeEach(() => {
    process.env.VEXO_API_KEY = "VEXO_TEST_KEY";
  });
  afterEach(() => {
    delete process.env.VEXO_API_KEY;
  });

  it("rejects when VEXO_API_KEY is missing", async () => {
    delete process.env.VEXO_API_KEY;
    await expect(
      callVexoApi({ endpoint: "openai/gpt-oss-120b:free", text: "hi", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ status: 500, message: /VEXO_API_KEY missing/ });
  });

  it("rejects empty text with 400", async () => {
    await expect(
      callVexoApi({ endpoint: "openai/gpt-oss-120b:free", text: "", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects text longer than MAX_TEXT_CHARS with 413", async () => {
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "x".repeat(MAX_TEXT_CHARS + 1),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects system prompt longer than MAX_SYSTEM_CHARS with 413", async () => {
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "hi",
        system: "x".repeat(MAX_SYSTEM_CHARS + 1),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects imageUrl on non-image model with 400", async () => {
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "hi",
        imageUrl: "https://x.com/y.jpg",
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ status: 400, message: /doesn't support images/ });
  });
});

describe("callVexoApi — happy path", () => {
  beforeEach(() => {
    process.env.VEXO_API_KEY = "VEXO_TEST_KEY";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    delete process.env.VEXO_API_KEY;
    vi.unstubAllGlobals();
  });

  it("sends Bearer auth + OpenAI body, returns data and metadata", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "test",
          choices: [{ message: { role: "assistant", content: "hello back" } }],
        }),
        { status: 200 },
      ),
    );
    const result = await callVexoApi({
      endpoint: "openai/gpt-oss-120b:free",
      text: "halo",
      timeoutMs: 5000,
    });
    expect(result.data).toBe("hello back");
    expect(result.attempts).toBe(1);
    expect(result.requestId).toMatch(/^[0-9a-f]{12}$/);

    const called = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = called[0] as string;
    expect(url).toBe("https://vexoapi.dev/api/v1/chat/completions");

    const init = called[1];
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer VEXO_TEST_KEY");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["x-request-id"]).toBe(result.requestId);
    expect(headers["x-attempt"]).toBe("1");

    const body = JSON.parse(init.body);
    expect(body.model).toBe("openai/gpt-oss-120b:free");
    expect(body.messages).toEqual([{ role: "user", content: "halo" }]);
    expect(body.temperature).toBe(0.3);
    expect(body.stream).toBe(false);
    expect(body.max_tokens).toBe(2048);
  });

  it("includes system message in messages array when provided", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 }),
    );
    await callVexoApi({
      endpoint: "openai/gpt-oss-120b:free",
      text: "q",
      system: "be helpful",
      timeoutMs: 5000,
    });
    const init = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.messages).toEqual([
      { role: "system", content: "be helpful" },
      { role: "user", content: "q" },
    ]);
  });
});

describe("callVexoApi — retries", () => {
  beforeEach(() => {
    process.env.VEXO_API_KEY = "VEXO_TEST_KEY";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    delete process.env.VEXO_API_KEY;
    vi.unstubAllGlobals();
  });

  it("retries on 503 (upstream denied) and succeeds on 2nd attempt", async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: "recovered" } }] }), {
          status: 200,
        }),
      );
    const result = await callVexoApi({
      endpoint: "openai/gpt-oss-120b:free",
      text: "q",
      timeoutMs: 5000,
      baseBackoffMs: 1,
    });
    expect(result.data).toBe("recovered");
    expect(result.attempts).toBe(2);
  });

  it("does NOT retry on 4xx caller errors (e.g. 413)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("payload too large", { status: 413 }),
    );
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        baseBackoffMs: 1,
      }),
    ).rejects.toMatchObject({ status: 413 });
    expect(fetch as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxAttempts and surfaces the last error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("server error", { status: 500 }),
    );
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        maxAttempts: 3,
        baseBackoffMs: 1,
      }),
    ).rejects.toMatchObject({ status: 500 });
    expect(fetch as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(3);
  });

  it("does NOT retry when caller signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        signal: ctrl.signal,
      }),
    ).rejects.toMatchObject({ name: "VexoApiCallError" });
    expect(fetch as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});

describe("callVexoApi — error response shapes", () => {
  beforeEach(() => {
    process.env.VEXO_API_KEY = "VEXO_TEST_KEY";
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    delete process.env.VEXO_API_KEY;
    vi.unstubAllGlobals();
  });

  it("maps 429 to status 429 (rate limit)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("rate-limited", { status: 429 }),
    );
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        maxAttempts: 1,
      }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("maps 402 to status 402 (out of credits)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("out of credits", { status: 402 }),
    );
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        maxAttempts: 1,
      }),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("parses OpenAI error envelope { error: { message } } as 502", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "model overloaded" } }), {
        status: 200,
      }),
    );
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        maxAttempts: 1,
      }),
    ).rejects.toMatchObject({ status: 502, message: /model overloaded/ });
  });

  it("throws on missing choices/content/text in response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: true, data: "ok" }), { status: 200 }),
    );
    await expect(
      callVexoApi({
        endpoint: "openai/gpt-oss-120b:free",
        text: "q",
        timeoutMs: 5000,
        maxAttempts: 1,
      }),
    ).rejects.toMatchObject({ status: 502, message: /unexpected shape/ });
  });
});
