import { enforceAiBudget, logAiUsage } from "./aiBudget.server";

const LOVABLE_AI = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 30_000;

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type CallAiOptions = {
  /** Owner of the call for rate-limit/audit. Pass null for system jobs (cron, seed). */
  userId: string | null;
  /** Feature label for ai_usage_logs (e.g. "scan.quote", "chat", "coach.daily"). */
  feature: string;
  messages: AiMessage[];
  model?: string;
  isPremium?: boolean;
  timeoutMs?: number;
  /** Skip rate-limit (use only for trusted internal jobs). */
  skipBudget?: boolean;
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
    const decision = await enforceAiBudget(opts.userId, !!opts.isPremium);
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
      body: JSON.stringify({ model, messages: opts.messages }),
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
