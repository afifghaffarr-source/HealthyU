import { AiGatewayError, type AiMultimodalMessage } from "./aiGateway.server";
import type { CoreMessage } from "ai";
import { callAiTextWithVision } from "./aiProviders";
export { AiGatewayError };

const DEFAULT_TIMEOUT_MS = 60_000;

export type StreamAiOptions = {
  model?: string;
  messages: AiMultimodalMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Streaming AI call — buffered as a single chunk (no upstream SSE exposed
 * by either VexoAPI or OpenRouter free tier for vision models).
 *
 * Routes through the multi-provider registry so vision works whenever
 * OPENROUTER_API_KEY is configured. Returns SSE-shaped body that callers
 * already parse via `parseSseChunk`.
 */
export async function streamAiChat(opts: StreamAiOptions): Promise<{
  body: ReadableStream<Uint8Array>;
  mode?: string;
}> {
  // Convert AiMultimodalMessage → CoreMessage (Vercel AI SDK shape).
  // Text content stays string; image parts become { type: "image", image: dataUrl }.
  const coreMessages: CoreMessage[] = opts.messages.map((m): CoreMessage => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content };
    }
    const parts: Array<
      { type: "text"; text: string } | { type: "image"; image: string | Uint8Array }
    > = [];
    for (const p of m.content) {
      if (p.type === "text") parts.push({ type: "text", text: p.text });
      else if (p.type === "image_url") {
        parts.push({ type: "image", image: p.image_url.url });
      }
      // input_audio and unknown parts are dropped (no provider supports)
    }
    if (parts.length === 0) {
      return { role: m.role, content: "" };
    }
    // Cast through CoreMessage — type narrowing across union is tricky
    // for CoreMessage's discriminated by role. The shapes we build here
    // are valid CoreMessage instances at runtime.
    return { role: m.role, content: parts } as CoreMessage;
  });

  const result = await callAiTextWithVision({
    feature: "chat.stream",
    messages: coreMessages,
    preferredModel: opts.model,
    maxTokens: opts.maxTokens,
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: opts.signal,
  });

  // Emit the full text as a single delta in a tiny SSE-shaped body.
  const ssePayload =
    `data: ${JSON.stringify({ choices: [{ delta: { content: result.text } }] })}\n\n` +
    `data: [DONE]\n\n`;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(ssePayload));
      controller.close();
    },
  });

  return { body, mode: result.mode };
}

/**
 * Parse a single chunk of OpenAI-compatible SSE text into delta strings.
 * Returns `{ deltas, remainder }` so the caller can carry the unfinished
 * tail across reads.
 */
export function parseSseChunk(buffer: string): { deltas: string[]; remainder: string } {
  const lines = buffer.split("\n");
  const remainder = lines.pop() ?? "";
  const deltas: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") continue;
    try {
      const json = JSON.parse(payload) as {
        choices?: { delta?: { content?: string } }[];
      };
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) deltas.push(delta);
    } catch {
      /* ignore */
    }
  }
  return { deltas, remainder };
}
