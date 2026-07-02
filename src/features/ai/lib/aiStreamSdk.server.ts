/**
 * AI SDK streaming — real SSE via Vercel AI SDK's streamText.
 *
 * Sprint 1c: replaces the fake "single chunk" streaming in aiStreamGateway.server.ts
 * with real chunk-by-chunk SSE. Uses `streamText` from `ai` package, which:
 *   - Returns an async iterable of UIMessage chunks (typed)
 *   - Converts to OpenAI-SSE format on the wire via `toUIMessageStream`
 *   - Supports abort signals cleanly (when client disconnects)
 *
 * The chat UI (`/api/chat/stream` route) already consumes OpenAI-SSE format,
 * so it works with this output without changes.
 *
 * Public API (additive):
 *   - streamChatWithSdk(opts) → { body: ReadableStream<Uint8Array> }
 *
 * Old `streamAiChat` in aiStreamGateway.server.ts still works for callers
 * that don't want to migrate. Migrate chat route separately.
 */

import { streamText } from "ai";
import { vexoModel } from "./vexoProvider";
import type { AiMultimodalMessage } from "./aiGateway.server";
import { AiGatewayError } from "./aiGateway.server";
import { enforceAiBudget } from "./aiBudget.server";
import { logServerError } from "@/lib/logger.server";
import { readPublicConfig } from "@/features/admin/lib/adminConfig.functions";

export { AiGatewayError };

export interface StreamChatSdkOptions {
  userId: string | null;
  feature: string;
  messages: AiMultimodalMessage[];
  model?: string;
  isPremium?: boolean;
  skipBudget?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
  maxTokens?: number;
}

/**
 * Convert internal AiMultimodalMessage to AI SDK Prompt format.
 *
 * Note: we collapse multi-image/multimodal messages to text-only for now
 * since Vexo free-tier models don't support images (consistent with
 * `endpointSupportsImage` returning false for all current models).
 */
function toPrompt(messages: AiMultimodalMessage[]): {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const conv: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of messages) {
    const text =
      typeof m.content === "string"
        ? m.content
        : m.content
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("\n");
    if (m.role === "system") {
      systemParts.push(text);
    } else if (m.role === "user" || m.role === "assistant") {
      conv.push({ role: m.role, content: text });
    }
    // skip tool messages (not supported by free-tier models)
  }
  return {
    system: systemParts.length ? systemParts.join("\n\n") : undefined,
    messages: conv,
  };
}

/**
 * Stream a chat completion via Vercel AI SDK.
 *
 * Output is OpenAI-compatible SSE format (`data: { choices: [{ delta: { content } }] }\n\n`),
 * matching what `/api/chat/stream` already emits and what the chat UI consumes.
 *
 * @example
 * ```ts
 * const { body } = await streamChatWithSdk({
 *   userId: user.id,
 *   feature: "chat.stream",
 *   messages: [
 *     { role: "system", content: "Kamu adalah ahli gizi Indonesia." },
 *     { role: "user", content: "Berapa kalori nasi goreng?" },
 *   ],
 * });
 * return new Response(body, { headers: { "Content-Type": "text/event-stream" } });
 * ```
 */
export async function streamChatWithSdk(opts: StreamChatSdkOptions): Promise<{
  body: ReadableStream<Uint8Array>;
}> {
  // ─── Rate limit (fail-fast, before we open the stream) ──────────────────
  if (opts.userId && !opts.skipBudget) {
    try {
      const decision = await enforceAiBudget(opts.userId, !!opts.isPremium);
      if (!decision.allowed) {
        const msg =
          decision.reason === "rate_hour"
            ? "Batas AI per jam tercapai. Coba lagi nanti."
            : decision.reason === "rate_day"
              ? "Batas pesan AI harian tercapai. Coba lagi besok."
              : "Batas token AI harian tercapai. Coba lagi besok.";
        throw new AiGatewayError(msg, 429);
      }
    } catch (e) {
      if (e instanceof AiGatewayError) throw e;
      // Sprint 38 — fail-open log goes through the structured logger so
      // envelope JSON gets sanitised if any PII creeps into the error.
      logServerError("ai.enforce-budget", e as Error);
      // Fail-open for chat (best-effort UX)
    }
  }

  const prompt = toPrompt(opts.messages);

  // ─── Read max tokens from config ────────────────────────────────────────
  const maxTokensConfigRaw = await readPublicConfig({
    data: { key: "ai.max_tokens_per_request", defaultValue: 1024 },
  });
  const maxTokensFromConfig = typeof maxTokensConfigRaw === "number" ? maxTokensConfigRaw : 1024;

  // ─── Stream from AI SDK ────────────────────────────────────────────────
  let streamResult: Awaited<ReturnType<typeof streamText>>;
  try {
    streamResult = streamText({
      model: vexoModel(opts.model ?? "openai/gpt-oss-120b:free"),
      system: prompt.system,
      messages: prompt.messages,
      maxTokens: opts.maxTokens ?? maxTokensFromConfig,
      abortSignal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 60_000),
      temperature: 0.3,
    });
  } catch (e) {
    const err = e as Error & { status?: number };
    throw new AiGatewayError(`AI stream init failed: ${err.message}`, err.status ?? 502);
  }

  // ─── Adapt AI SDK text stream → OpenAI-SSE wire format ─────────────────
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const delta of streamResult.textStream) {
          if (opts.signal?.aborted) break;
          const payload = `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        // On stream error, emit an OpenAI-style error chunk then close
        const msg = (e as Error)?.message ?? "stream error";
        const errPayload = `data: ${JSON.stringify({ error: { message: msg } })}\n\n`;
        try {
          controller.enqueue(encoder.encode(errPayload));
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      // Client disconnected — AI SDK streamText already reacts to abortSignal
      // since we passed it above. Nothing else to do here.
    },
  });

  return { body };
}
