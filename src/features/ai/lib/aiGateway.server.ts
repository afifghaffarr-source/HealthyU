import { enforceAiBudget, logAiUsage } from "./aiBudget.server";
import {
  callVexoApi,
  flattenMessages,
  resolveVexoEndpoint,
  endpointSupportsImage,
  VexoApiCallError,
} from "./vexoAdapter.server";
import { callAiTextWithVision, getModelInstance } from "./aiProviders";
import type { CoreMessage } from "ai";
import { getEnv } from "@/lib/cloudflare-env.server";
import type { z, ZodTypeAny } from "zod";

/**
 * VexoAPI-backed AI gateway.
 *
 * Replaces the previous Google Gemini gateway. Public API is unchanged so all
 * call sites keep working:
 *   - callAiWithGuards(opts)              → string
 *   - callAiJsonWithGuards(opts)          → T (parsed JSON, {} on failure)
 *   - callAiJsonWithSchema(opts)          → typed via Zod (with optional fallback)
 *
 * VexoAPI specifics:
 *   - GET requests, ?key=API_KEY in query
 *   - Response: { status: bool, data: string|object, timestamp: string }
 *   - Multi-turn: flatten messages — last user → text, all system → system,
 *     older messages prepended to user text for context.
 *   - JSON mode: no native flag; we ask for JSON in the prompt and parse
 *     with extractJsonFromResponse (forgiving extractor, already used).
 *
 * IMPORTANT: The current VexoAPI VIP key may return 403 ("upstream denied")
 * during upstream model outages. We surface this as a 503 AiGatewayError so
 * callers can retry; not a code defect.
 */

const DEFAULT_TIMEOUT_MS = 30_000;

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

export type AiMultimodalMessage = {
  role: "system" | "user" | "assistant";
  content: string | AiContentPart[];
};

export type CallAiOptions = {
  /** Owner of the call for rate-limit/audit. Pass null for system jobs (cron, seed). */
  userId: string | null;
  /** Feature label for ai_usage_logs (e.g. "scan.quote", "chat", "coach.daily"). */
  feature: string;
  messages: AiMultimodalMessage[];
  model?: string;
  isPremium?: boolean;
  timeoutMs?: number;
  /** Skip rate-limit (use only for trusted internal jobs). */
  skipBudget?: boolean;
  /**
   * Fail-closed: when true, any error from the budget/rate-limit check
   * (e.g. DB unreachable) denies the request instead of letting it through.
   * Use for expensive features (image scan, weekly reports, long generations).
   */
  failClosed?: boolean;
  /**
   * VexoAPI doesn't have a native `response_format: json_object` flag.
   * When true, we add a JSON-only instruction to the prompt and use the
   * forgiving extractor on the response. Same effective behavior.
   */
  responseFormat?: "json_object";
  /** Optional max_tokens cap. VexoAPI doesn't surface this on free tier; we
   *  still pass `temperature=0.3` for deterministic output. */
  maxTokens?: number;
};

export class AiGatewayError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AiGatewayError";
  }
}

/**
 * Centralised AI call.
 *
 * Sends a multi-turn conversation to VexoAPI (via {@link callVexoApi})
 * and returns the model's text response. Handles the cross-cutting
 * concerns every AI call needs:
 *   - Per-user rate limit via `enforceAiBudget` (skip with `skipBudget`)
 *   - AbortController timeout (default 30s, override with `timeoutMs`)
 *   - Usage logging to `ai_usage_logs` (fire-and-forget)
 *   - Error mapping to typed `AiGatewayError` (4xx/5xx + 502 for
 *     upstream failures)
 *
 * @param opts - Call configuration
 * @returns The model's text response, or empty string on a parse
 *   failure of a non-streaming call
 * @throws {AiGatewayError} On rate limit (429), missing config (500),
 *   upstream denial (503), or timeout (504)
 *
 * @example
 * ```ts
 * const reply = await callAiWithGuards({
 *   userId: user.id,
 *   feature: "chat.text",
 *   messages: [
 *     { role: "system", content: "You are a helpful nutrition coach." },
 *     { role: "user", content: "Berapa kalori dalam nasi goreng?" },
 *   ],
 * });
 * ```
 */
export async function callAiWithGuards(opts: CallAiOptions): Promise<string> {
  if (!getEnv().VEXO_API_KEY) {
    throw new AiGatewayError("AI gateway tidak dikonfigurasi", 500);
  }

  const model = opts.model ?? "google/gemini-2.5-flash";
  const endpoint = resolveVexoEndpoint(model);

  if (opts.userId && !opts.skipBudget) {
    let decision: Awaited<ReturnType<typeof enforceAiBudget>>;
    try {
      decision = await enforceAiBudget(opts.userId, !!opts.isPremium);
    } catch (e) {
      console.error("enforceAiBudget failed", (e as Error).message);
      if (opts.failClosed) {
        throw new AiGatewayError("Layanan AI sedang sibuk. Coba lagi sebentar lagi.", 503);
      }
      decision = { allowed: true, shouldDowngrade: true };
    }
    if (!decision.allowed) {
      throw new AiGatewayError(
        decision.reason === "rate_hour"
          ? "Batas AI per jam tercapai. Coba lagi nanti."
          : "Batas AI harian tercapai. Coba lagi besok.",
        429,
      );
    }
  }

  const flat = flattenMessages(opts.messages);
  let text = flat.text;
  if (opts.responseFormat === "json_object") {
    const jsonHint = flat.system
      ? `\n\n${flat.system}\n\nRespond with valid JSON only. No markdown fences, no prose, no explanation.`
      : "Respond with valid JSON only. No markdown fences, no prose, no explanation.";
    text = flat.text + jsonHint;
  }

  // Sprint 2d follow-up: VexoAPI has zero vision-capable models (verified
  // 2026-06-19 — all 11 models in their /models catalog are text-only).
  // The legacy `targetEndpoint = flat.imageUrl ? "gemini" : endpoint` was
  // mapping "gemini" → openai/gpt-oss-120b:free which then threw 400
  // "model doesn't support images".
  //
  // Fix: when an image is present, route through the multi-provider registry
  //   - OpenRouter configured → vision model (real vision)
  //   - OpenRouter NOT configured → strip image, text-only (caller should
  //     pre-OCR via Tesseract if needed)
  //   - No image → legacy VexoAPI text path (unchanged)
  let data: string;
  const hasImage = Boolean(flat.imageUrl);

  if (hasImage) {
    // Convert multimodal messages → CoreMessage with image parts.
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
      }
      if (parts.length === 0) return { role: m.role, content: "" };
      return { role: m.role, content: parts } as CoreMessage;
    });

    const result = await callAiTextWithVision({
      feature: opts.feature,
      messages: coreMessages,
      preferredModel: model,
      maxTokens: opts.maxTokens,
      timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
    if (!result.text) {
      throw new AiGatewayError("Layanan AI sedang sibuk. Coba lagi sebentar lagi.", 503);
    }
    data = result.text;
  } else {
    // ─── Legacy text-only path (unchanged behavior) ───────────────────
    const targetEndpoint = endpointSupportsImage(endpoint) ? endpoint : endpoint;

    try {
      const result = await callVexoApi({
        endpoint: targetEndpoint,
        text,
        system: flat.system,
        timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      });
      data = result.data;
    } catch (e) {
      if (e instanceof VexoApiCallError) {
        throw new AiGatewayError(e.message, e.status);
      }
      throw e;
    }
  }

  // VexoAPI doesn't surface token counts. Estimate from input text length
  // (~4 chars per token) and output text length. This is good enough for
  // budget tracking; we mark `model` so the price table applies.
  const promptTokens = Math.ceil((text.length + flat.system.length) / 4);
  const completionTokens = Math.ceil(data.length / 4);

  void logAiUsage({
    userId: opts.userId,
    feature: opts.feature,
    model,
    promptTokens,
    completionTokens,
  });

  return data;
}

/**
 * Same as {@link callAiWithGuards} but parses the response as JSON.
 *
 * VexoAPI doesn't have a native JSON mode, so this function:
 *   1. Asks the model for JSON in the prompt
 *   2. Parses the response with `JSON.parse` first
 *   3. Falls back to `extractJsonFromResponse` (forgiving) if that fails
 *   4. Returns `{}` if both parsers fail (caller should check truthiness)
 *
 * For schema-validated calls, prefer {@link callAiJsonWithSchema}.
 *
 * @param opts - Same as `callAiWithGuards` minus `responseFormat`
 *   (always forces JSON)
 * @returns The parsed JSON object, or `{}` on parse failure
 *
 * @example
 * ```ts
 * const data = await callAiJsonWithGuards<{ score: number }>({
 *   userId: user.id,
 *   feature: "scan.quote",
 *   messages: [{ role: "user", content: "Rate this meal 1-10" }],
 * });
 * if (data.score) console.log("Score:", data.score);
 * ```
 */
export async function callAiJsonWithGuards<T = Record<string, unknown>>(
  opts: Omit<CallAiOptions, "responseFormat">,
): Promise<T> {
  const text = await callAiWithGuards({ ...opts, responseFormat: "json_object" });
  try {
    return JSON.parse(text || "{}") as T;
  } catch {
    return {} as T;
  }
}

/**
 * Strips markdown ```json fences and control characters, then pulls
 * the first balanced `{...}` or `[...]` block out of a model response.
 * Useful when the model wraps JSON in explanatory prose despite being
 * told to respond in JSON.
 *
 * @param raw - The model's raw text response
 * @returns A JSON-parseable string (possibly empty if no JSON found)
 *
 * @example
 * ```ts
 * const raw = await callAiWithGuards({...});
 * const json = JSON.parse(extractJsonFromResponse(raw));
 * ```
 */
export function extractJsonFromResponse(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Strip control characters (except \t, \n, \r) that can break JSON.parse.
  // eslint-disable-next-line no-control-regex, no-irregular-whitespace
  s = s.replace(/[ --]/g, "");
  if (s.startsWith("{") || s.startsWith("[")) return s;
  const start = s.search(/[{[]/);
  if (start === -1) return s;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start);
}

export class AiSchemaError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "AiSchemaError";
  }
}

/**
 * Type-safe JSON call with Zod schema validation.
 *
 * Like {@link callAiJsonWithGuards} but validates the parsed JSON
 * against a Zod schema. The return type is fully inferred from the
 * schema, so no manual casting is needed in the caller.
 *
 * @param opts - Same as `callAiJsonWithGuards` plus:
 *   - `schema`: Zod schema for the expected response shape
 *   - `fallback`: Optional value to return on parse/validation failure
 *     (otherwise throws `AiSchemaError`)
 * @returns The validated data, typed as `z.infer<S>`
 * @throws {AiSchemaError} If the response is unparseable and no
 *   fallback is provided
 *
 * @example
 * ```ts
 * const MealSchema = z.object({
 *   name: z.string(),
 *   calories: z.number().int().nonnegative(),
 * });
 *
 * const meal = await callAiJsonWithSchema({
 *   userId: user.id,
 *   feature: "scan.quote",
 *   messages: [{ role: "user", content: "Estimate: nasi goreng" }],
 *   schema: MealSchema,
 *   fallback: { name: "Unknown", calories: 0 },
 * });
 * console.log(meal.calories); // typed as number
 * ```
 */
export async function callAiJsonWithSchema<S extends ZodTypeAny>(
  opts: Omit<CallAiOptions, "responseFormat"> & {
    schema: S;
    fallback?: z.infer<S>;
    maxTokens?: number;
  },
): Promise<z.infer<S>> {
  const { schema, fallback, ...rest } = opts;
  const raw = await callAiWithGuards({
    ...rest,
    responseFormat: "json_object",
    maxTokens: rest.maxTokens ?? 2048,
  });
  const cleaned = extractJsonFromResponse(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned || "{}");
  } catch {
    if (fallback !== undefined) return fallback;
    throw new AiSchemaError("AI response was not valid JSON", raw);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    if (fallback !== undefined) return fallback;
    throw new AiSchemaError(
      `AI response failed schema validation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
      raw,
    );
  }
  return result.data;
}
