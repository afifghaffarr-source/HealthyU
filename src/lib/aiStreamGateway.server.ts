import { AiGatewayError, type AiMultimodalMessage } from "./aiGateway.server";

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 60_000;

export type StreamAiOptions = {
  model: string;
  messages: AiMultimodalMessage[];
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/**
 * Centralised streaming AI call. Caller is responsible for parsing SSE
 * `data:` lines from the returned body. Throws AiGatewayError for
 * misconfig / timeout / 429 / 402 / non-OK responses.
 */
export async function streamAiChat(opts: StreamAiOptions): Promise<{
  body: ReadableStream<Uint8Array>;
}> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AiGatewayError("AI gateway tidak dikonfigurasi", 500);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onUserAbort = () => ctrl.abort();
  if (opts.signal) opts.signal.addEventListener("abort", onUserAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(LOVABLE_AI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        stream: true,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
      }),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const isAbort = (e as Error)?.name === "AbortError";
    throw new AiGatewayError(
      isAbort ? "AI gateway timeout" : `AI gateway error: ${(e as Error).message}`,
      isAbort ? 504 : 502,
    );
  }
  // Don't clearTimeout here — let it run until stream ends (caller consumes body).
  // The signal aborts will propagate to the underlying connection.
  void timer;

  if (res.status === 429) throw new AiGatewayError("AI gateway rate-limited", 429);
  if (res.status === 402) throw new AiGatewayError("Kredit AI habis", 402);
  if (!res.ok || !res.body) {
    const body = res.body ? await res.text().catch(() => "") : "";
    throw new AiGatewayError(`AI gateway ${res.status}: ${body.slice(0, 200)}`, res.status);
  }

  return { body: res.body };
}

/**
 * Parse a single chunk of OpenAI-compatible SSE text into delta strings.
 * Returns `{ deltas, remainder }` so the caller can carry the unfinished
 * tail across reads.
 */
export function parseSseChunk(
  buffer: string,
): { deltas: string[]; remainder: string } {
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