import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  callVexoApi,
  endpointSupportsImage,
  flattenMessages,
  MAX_SYSTEM_CHARS,
  MAX_TEXT_CHARS,
  resolveVexoEndpoint,
  VexoApiCallError,
} from "@/features/ai/lib/vexoAdapter";

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
  it("maps legacy gemini names to VexoAPI endpoints", () => {
    expect(resolveVexoEndpoint("google/gemini-2.5-flash")).toBe("gptoss120b");
    expect(resolveVexoEndpoint("google/gemini-2.5-flash-lite")).toBe("glm47flash");
    expect(resolveVexoEndpoint("google/gemini-2.5-pro")).toBe("gemini");
  });
  it("passes through canonical VexoAPI names", () => {
    expect(resolveVexoEndpoint("gptoss120b")).toBe("gptoss120b");
    expect(resolveVexoEndpoint("glm47flash")).toBe("glm47flash");
    expect(resolveVexoEndpoint("gemini")).toBe("gemini");
  });
  it("falls back to gptoss120b for unknown models", () => {
    expect(resolveVexoEndpoint("gpt-5")).toBe("gptoss120b");
    expect(resolveVexoEndpoint("")).toBe("gptoss120b");
  });
});

describe("endpointSupportsImage", () => {
  it("only gemini endpoint supports image", () => {
    expect(endpointSupportsImage("gemini")).toBe(true);
    expect(endpointSupportsImage("gptoss120b")).toBe(false);
    expect(endpointSupportsImage("glm47flash")).toBe(false);
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
      callVexoApi({ endpoint: "gptoss120b", text: "hi", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ status: 500, message: /VEXO_API_KEY missing/ });
  });

  it("rejects empty text with 400", async () => {
    await expect(
      callVexoApi({ endpoint: "gptoss120b", text: "", timeoutMs: 1000 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects text longer than MAX_TEXT_CHARS with 413", async () => {
    await expect(
      callVexoApi({
        endpoint: "gptoss120b",
        text: "x".repeat(MAX_TEXT_CHARS + 1),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects system prompt longer than MAX_SYSTEM_CHARS with 413", async () => {
    await expect(
      callVexoApi({
        endpoint: "gptoss120b",
        text: "hi",
        system: "x".repeat(MAX_SYSTEM_CHARS + 1),
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ status: 413 });
  });

  it("rejects imageUrl on non-image endpoint with 400", async () => {
    await expect(
      callVexoApi({
        endpoint: "gptoss120b",
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

  it("sends key + text + temperature, returns data and metadata", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: true, data: "hello back" }), { status: 200 }),
    );
    const result = await callVexoApi({
      endpoint: "gptoss120b",
      text: "halo",
      timeoutMs: 5000,
    });
    expect(result.data).toBe("hello back");
    expect(result.attempts).toBe(1);
    expect(result.requestId).toMatch(/^[0-9a-f]{12}$/);

    const called = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const url = called[0] as string;
    expect(url).toContain("key=VEXO_TEST_KEY");
    expect(url).toContain("text=halo");
    expect(url).toContain("temperature=0.3");

    const headers = called[1].headers as Record<string, string>;
    expect(headers["x-request-id"]).toBe(result.requestId);
    expect(headers["x-attempt"]).toBe("1");
  });

  it("uses promptSystem for gemini endpoint, system for others", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: true, data: "ok" }), { status: 200 }),
    );
    await callVexoApi({
      endpoint: "gemini",
      text: "q",
      system: "be helpful",
      timeoutMs: 5000,
    });
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("promptSystem=be+helpful");
    expect(url).not.toContain("system=be+helpful");
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
        new Response(JSON.stringify({ status: true, data: "recovered" }), { status: 200 }),
      );
    const result = await callVexoApi({
      endpoint: "gptoss120b",
      text: "q",
      timeoutMs: 5000,
      baseBackoffMs: 1, // speed up test
    });
    expect(result.data).toBe("recovered");
    expect(result.attempts).toBe(2);
  });

  it("does NOT retry on 4xx caller errors (e.g. 413)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("payload too large", { status: 413 }),
    );
    await expect(
      callVexoApi({ endpoint: "gptoss120b", text: "q", timeoutMs: 5000, baseBackoffMs: 1 }),
    ).rejects.toMatchObject({ status: 413 });
    expect(fetch as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(1);
  });

  it("retries up to maxAttempts and surfaces the last error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response("server error", { status: 500 }),
    );
    await expect(
      callVexoApi({
        endpoint: "gptoss120b",
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
        endpoint: "gptoss120b",
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
      callVexoApi({ endpoint: "gptoss120b", text: "q", timeoutMs: 5000, maxAttempts: 1 }),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("maps 402 to status 402 (out of credits)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response("out of credits", { status: 402 }),
    );
    await expect(
      callVexoApi({ endpoint: "gptoss120b", text: "q", timeoutMs: 5000, maxAttempts: 1 }),
    ).rejects.toMatchObject({ status: 402 });
  });

  it("parses VexoAPI envelope { status: false, error } as 502", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: false, error: "model overloaded" }), { status: 200 }),
    );
    await expect(
      callVexoApi({ endpoint: "gptoss120b", text: "q", timeoutMs: 5000, maxAttempts: 1 }),
    ).rejects.toMatchObject({ status: 502, message: /model overloaded/ });
  });

  it("handles object-shaped data with .result / .text / .response / .output", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ status: true, data: { text: "nested-text" } }), {
        status: 200,
      }),
    );
    const result = await callVexoApi({
      endpoint: "gptoss120b",
      text: "q",
      timeoutMs: 5000,
    });
    expect(result.data).toBe("nested-text");
  });
});
