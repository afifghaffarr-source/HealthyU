import { AiGatewayError, type AiMultimodalMessage } from "./aiGateway.server";
import { callVexoApi, flattenMessages } from "./vexoAdapter.server";
export { AiGatewayError };

const DEFAULT_TIMEOUT_MS = 60_000;

export type StreamAiOptions = {
  model: string;
  messages: AiMultimodalMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Streaming AI call — VexoAPI doesn't expose SSE, so we buffer the full
 * response and emit it as a single chunk. The chunked TextDecoder stream
 * still gives the UI something to consume chunk-by-chunk from the server
 * side, and we still expose a `body: ReadableStream<Uint8Array>` for
 * caller compatibility (the chat route just iterates deltas).
 *
 * If VexoAPI ever ships SSE, replace this with a real stream forwarder.
 */
export async function streamAiChat(opts: StreamAiOptions): Promise<{
  body: ReadableStream<Uint8Array>;
}> {
  // Run the full call (uses the same auth/budget/timeout path as the
  // non-streaming gateway via the shared adapter). Throw the same way.
  const flat = flattenMessages(opts.messages);

  // We don't have a streaming endpoint, so we resolve to one chunk.
  // We still respect the abort signal — if the client disconnects, we
  // abort the upstream fetch.
  const { data } = await callVexoApi({
    endpoint: opts.model?.includes("pro") ? "gptoss120b" : "gptoss120b",
    text: flat.text,
    system: flat.system,
    imageUrl: flat.imageUrl,
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    signal: opts.signal,
  });

  // Emit the full text as a single delta in a tiny SSE-shaped body.
  // We use the same `data: {...}\n\n` shape the existing parseSseChunk
  // already understands, so callers don't have to change.
  const ssePayload =
    `data: ${JSON.stringify({ choices: [{ delta: { content: data } }] })}\n\n` + `data: [DONE]\n\n`;

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(ssePayload));
      controller.close();
    },
  });

  return { body };
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
