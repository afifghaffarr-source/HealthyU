import { enforceAiBudget, logAiUsage } from "./aiBudget.server";
import type { z, ZodTypeAny } from "zod";

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";
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
  /** If "json_object", asks the gateway to return strict JSON. */
  responseFormat?: "json_object";
  /** Optional max_tokens cap forwarded to the gateway. */
  maxTokens?: number;
};

export class AiGatewayError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AiGatewayError";
  }
}

/**
 * Centralised Lovable AI Gateway call.
 * - Fail-closed if LOVABLE_API_KEY missing.
 * - Per-user rate limit via enforceAiBudget (skip with skipBudget).
 * - AbortController timeout (default 30s).
 * - Logs usage to ai_usage_logs (fire-and-forget).
 * - Maps 429/402/timeout to typed AiGatewayError.
 */
export async function callAiWithGuards(opts: CallAiOptions): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new AiGatewayError("AI gateway tidak dikonfigurasi", 500);

  const model = opts.model ?? "google/gemini-2.5-flash";

  if (opts.userId && !opts.skipBudget) {
    let decision: Awaited<ReturnType<typeof enforceAiBudget>>;
    try {
      decision = await enforceAiBudget(opts.userId, !!opts.isPremium);
    } catch (e) {
      console.error("enforceAiBudget failed", (e as Error).message);
      if (opts.failClosed) {
        throw new AiGatewayError(
          "Layanan AI sedang sibuk. Coba lagi sebentar lagi.",
          503,
        );
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

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(LOVABLE_AI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        ...(opts.maxTokens ? { max_tokens: opts.maxTokens } : {}),
        ...(opts.responseFormat
          ? { response_format: { type: opts.responseFormat } }
          : {}),
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
  clearTimeout(timer);

  if (res.status === 429) throw new AiGatewayError("AI gateway rate-limited", 429);
  if (res.status === 402) throw new AiGatewayError("Kredit AI habis", 402);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AiGatewayError(`AI gateway ${res.status}: ${body.slice(0, 200)}`, res.status);
  }

  const json = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  } | null;
  const content = json?.choices?.[0]?.message?.content ?? "";

  void logAiUsage({
    userId: opts.userId,
    feature: opts.feature,
    model,
    promptTokens: json?.usage?.prompt_tokens,
    completionTokens: json?.usage?.completion_tokens,
  });

  return content;
}

/**
 * Same as callAiWithGuards but parses JSON response.
 * Forces response_format: json_object. Returns {} on parse failure.
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
 * Strip ```json fences / control chars and pull the first balanced {...} or [...]
 * out of a model response so JSON.parse stops dying on stray prose.
 */
export function extractJsonFromResponse(raw: string): string {
  if (!raw) return "";
  let s = raw.trim();
  // strip code fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // remove control chars (except \n \r \t)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  // already starts with { or [
  if (s.startsWith("{") || s.startsWith("[")) return s;
  // find first balanced object/array
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
  constructor(message: string, public readonly raw: string) {
    super(message);
    this.name = "AiSchemaError";
  }
}

/**
 * Like callAiJsonWithGuards but validates against a Zod schema and returns a
 * typed fallback when parsing/validation fails (no exceptions to the UI).
 * Pass `fallback` for the safe default; omit to throw AiSchemaError on failure.
 */
export async function callAiJsonWithSchema<S extends ZodTypeAny>(
  opts: Omit<CallAiOptions, "responseFormat"> & {
    schema: S;
    fallback?: z.infer<S>;
    /** Default 2048. Pushed to the gateway as max_tokens to reduce truncation. */
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
