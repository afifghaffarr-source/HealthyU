/**
 * Tests for the chat stream empty-response fallback (Sprint 5a polish).
 *
 * Verifies that when the AI stream ends with no text:
 * - A user-friendly error is thrown (not silent success)
 * - A telemetry event is reported via the existing `reportError` channel
 * - No user message text leaks into the telemetry payload
 *
 * Strategy: use a stub `fetch` to return an SSE response that yields
 * a `done {}` event with no `data` deltas. Then call the production
 * `reportError` directly (per the existing errorReporting test pattern)
 * and assert the resulting POST payload.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { reportError } from "../../../../lib/errorReporting";

// Mirror the SSE parser + empty-fallback logic from ChatPage.tsx so we
// can test it in isolation. The production code is wrapped in a React
// mutation; this function is the deterministic core that decides
// "empty response → throw + telemetry".
async function consumeStream(res: Response): Promise<string> {
  if (!res.body) throw new Error("no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";
  let upstreamError: string | null = null;
  const handleEvent = (evt: string) => {
    const eventLine = evt.split("\n").find((l) => l.startsWith("event:"));
    const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
    if (eventLine && dataLine) {
      const evtName = eventLine.slice(6).trim();
      if (evtName === "error") {
        try {
          const json = JSON.parse(dataLine.slice(5).trim());
          upstreamError = typeof json.message === "string" ? json.message : "AI stream error";
        } catch {
          /* ignore */
        }
        return;
      }
      if (evtName !== "data") return;
    }
    if (!dataLine) return;
    try {
      const json = JSON.parse(dataLine.slice(5).trim());
      if (typeof json.delta === "string") {
        acc += json.delta;
      }
    } catch {
      /* ignore */
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split("\n\n");
    buf = events.pop() ?? "";
    for (const evt of events) handleEvent(evt);
  }
  if (buf.trim()) handleEvent(buf);
  if (!acc && upstreamError) {
    reportError(
      new Error(`AI stream error: ${upstreamError}`),
      { source: "chat.ai.stream_error_empty", upstream_error: upstreamError },
      { mechanism: "manual", severity: "warning", handled: true },
    );
    throw new Error(`AI sedang bermasalah. Coba lagi sebentar ya. (${upstreamError})`);
  }
  if (!acc) {
    reportError(
      new Error("AI stream returned no text"),
      { source: "chat.ai.empty_response" },
      { mechanism: "manual", severity: "warning", handled: true },
    );
    throw new Error("AI tidak menghasilkan balasan. Coba lagi ya.");
  }
  return acc;
}

function makeSseResponse(events: string[]): Response {
  const body = events.join("\n\n") + "\n\n";
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

const originalFetch = globalThis.fetch;

describe("chat stream empty-response fallback", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubEnv("DEV", false);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the accumulated text on a normal SSE stream (no telemetry)", async () => {
    const res = makeSseResponse([
      'event: data\ndata: {"delta":"Halo "}',
      'event: data\ndata: {"delta":"dunia"}',
      "event: done\ndata: {}",
    ]);
    const out = await consumeStream(res);
    expect(out).toBe("Halo dunia");
    // give microtask a tick so reportError can fire (it shouldn't)
    await Promise.resolve();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("throws a user-friendly error and posts telemetry when stream yields no text", async () => {
    const res = makeSseResponse(["event: done\ndata: {}"]);
    await expect(consumeStream(res)).rejects.toThrow(/tidak menghasilkan balasan/);
    await Promise.resolve();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body);
    expect(body.severity).toBe("warning");
    expect(body.context.source).toBe("chat.ai.empty_response");
    expect(body.message).toMatch(/no text/i);
  });

  it("reports telemetry for the empty case (whitespace-only deltas are non-empty by current contract)", async () => {
    // Current ChatPage.tsx contract: `if (!acc) throw` — so any non-empty
    // string (even "   ") is treated as a successful reply and skips
    // the empty-response branch. This test documents that contract:
    // a whitespace-only delta is NOT a fallback trigger.
    const res = makeSseResponse(['event: data\ndata: {"delta":"   "}', "event: done\ndata: {}"]);
    const out = await consumeStream(res);
    expect(out).toBe("   ");
    await Promise.resolve();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("posts the upstream-error telemetry when an error event precedes done", async () => {
    const res = makeSseResponse([
      'event: error\ndata: {"message":"rate limit"}',
      "event: done\ndata: {}",
    ]);
    await expect(consumeStream(res)).rejects.toThrow(/AI sedang bermasalah/);
    await Promise.resolve();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.context.source).toBe("chat.ai.stream_error_empty");
    expect(body.context.upstream_error).toBe("rate limit");
  });

  it("never includes user message text in the telemetry payload", async () => {
    // Sanity: the context object we send has no `text` / `message` /
    // `prompt` fields where user content could leak.
    const res = makeSseResponse(["event: done\ndata: {}"]);
    await expect(consumeStream(res)).rejects.toThrow();
    await Promise.resolve();
    const [, init] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body);
    const ctx = body.context;
    for (const key of ["text", "prompt", "user_message", "body", "content"]) {
      expect(ctx).not.toHaveProperty(key);
    }
    // body.message is the safe "AI stream returned no text" — never the user prompt.
    expect(body.message).not.toMatch(/halo|dunia|prompt|user/i);
  });
});
