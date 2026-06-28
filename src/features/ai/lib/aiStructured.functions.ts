/**
 * AI Structured Output — Vercel AI SDK based Zod-native structured generation.
 *
 * Sprint 1c: replaces the manual JSON-mode prompt hack + `extractJsonFromResponse`
 * parser with AI SDK's native `generateObject` for type-safe structured output.
 * The model receives the schema as a tool definition, so it returns valid JSON
 * on the first try in most cases — no more "```json\n{...}\n```" prose wrangling.
 *
 * Public API (additive — does NOT replace existing callAiJsonWithSchema):
 *   - callAiStructured<S>(opts) → Promise<z.infer<S>>
 *
 * Comparison with callAiJsonWithSchema (existing):
 *   ┌──────────────────────┬──────────────────────┬────────────────────────┐
 *   │ Aspect               │ callAiJsonWithSchema │ callAiStructured       │
 *   ├──────────────────────┼──────────────────────┼────────────────────────┤
 *   │ JSON enforcement     │ Prompt hack          │ Native (tool/schema)   │
 *   │ Schema validation    │ Zod safeParse        │ Zod safeParse (SDK)    │
 *   │ Token usage          │ Estimated (chars/4)  │ Exact (provider)       │
 *   │ Provider abstraction │ Vexo-only            │ Any OpenAI-compatible  │
 *   └──────────────────────┴──────────────────────┴────────────────────────┘
 *
 * Migrate call sites gradually: start with features that benefit most from
 * schema enforcement (scan, recipes, meal plans). Leave chat/coach on the
 * old path until validated.
 */

import { generateObject, NoObjectGeneratedError } from "ai";
import type { z, ZodTypeAny } from "zod";
import { getModelInstance } from "./aiProviders";
import { AiGatewayError } from "./aiGateway.server";
import { enforceAiBudget, logAiUsage } from "./aiBudget.server";
import { safeLogServerError } from "@/lib/logSafe";

export { AiGatewayError };

export interface CallAiStructuredOptions<S extends ZodTypeAny> {
  /** Owner of the call for rate-limit/audit. Pass null for system jobs (cron, seed). */
  userId: string | null;
  /** Feature label for ai_usage_logs (e.g. "scan.quote", "recipe.gen"). */
  feature: string;
  /** System prompt (optional). */
  system?: string;
  /** User prompt (required). */
  prompt: string;
  /** Zod schema for the expected response. */
  schema: S;
  /** Optional name to give the schema (helps LLM guidance, e.g. "Meal"). */
  schemaName?: string;
  /** Optional description to give the schema. */
  schemaDescription?: string;
  /** Model identifier. Defaults to gemini-2.5-flash (gpt-oss-120b:free upstream). */
  model?: string;
  /** Treat as premium user (relaxed rate limits). */
  isPremium?: boolean;
  /** Skip rate-limit check. Use only for trusted internal jobs. */
  skipBudget?: boolean;
  /** Override timeout in ms (default 30_000). */
  timeoutMs?: number;
  /** Max tokens cap. Default 2048. */
  maxTokens?: number;
  /** Fallback value if schema validation fails. If unset, throws AiSchemaError. */
  fallback?: z.infer<S>;
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
 * Generate a typed object from the model using Zod-native structured output.
 *
 * @example
 * ```ts
 * const MealSchema = z.object({
 *   name: z.string().min(1),
 *   calories: z.number().int().nonnegative(),
 * });
 *
 * const meal = await callAiStructured({
 *   userId: user.id,
 *   feature: "scan.quote",
 *   system: "You are an Indonesian nutrition expert.",
 *   prompt: "Estimate: nasi goreng with egg",
 *   schema: MealSchema,
 *   schemaName: "MealEstimate",
 *   fallback: { name: "Unknown", calories: 0 },
 * });
 * ```
 */
export async function callAiStructured<S extends ZodTypeAny>(
  opts: CallAiStructuredOptions<S>,
): Promise<z.infer<S>> {
  // ─── Rate limit ─────────────────────────────────────────────────────────
  if (opts.userId && !opts.skipBudget) {
    try {
      const decision = await enforceAiBudget(opts.userId, !!opts.isPremium);
      if (!decision.allowed) {
        throw new AiGatewayError(
          decision.reason === "rate_hour"
            ? "Batas AI per jam tercapai. Coba lagi nanti."
            : "Batas AI harian tercapai. Coba lagi besok.",
          429,
        );
      }
    } catch (e) {
      if (e instanceof AiGatewayError) throw e;
      // Sprint 38 — safe dynamic-import shim keeps logger.server out of
      // the client bundle (this file is co-imported via useServerFn).
      safeLogServerError("ai-structured.enforce-budget", e as Error)
        // Log helper itself can't return; absent await so we don't block.
        .catch(() => {});
      // Fail-open for non-fail-closed features, matching existing
      // aiGateway.server.ts behavior for best-effort UX.
    }
  }

  // ─── Call AI SDK ────────────────────────────────────────────────────────
  let result: Awaited<ReturnType<typeof generateObject>>;
  try {
    result = await generateObject({
      model: getModelInstance(opts.model ?? "google/gemini-2.5-flash"),
      system: opts.system,
      prompt: opts.prompt,
      schema: opts.schema,
      schemaName: opts.schemaName,
      schemaDescription: opts.schemaDescription,
      maxTokens: opts.maxTokens ?? 2048,
      abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
  } catch (e) {
    // Outer safety net: if caller provided a fallback, ALWAYS return it
    // regardless of what shape the error takes. Better UX than 502.
    if (opts.fallback !== undefined) return opts.fallback;

    // NoObjectGeneratedError = model didn't produce a structured object.
    // This is the "empty tool_calls" or "non-JSON" case — throw AiSchemaError.
    try {
      if (NoObjectGeneratedError.isInstance(e)) {
        throw new AiSchemaError(
          "AI did not produce a structured output matching the schema",
          (e as { text?: string }).text ?? "",
        );
      }
    } catch (innerErr) {
      if (innerErr instanceof AiSchemaError) throw innerErr;
      throw new AiSchemaError("AI did not produce a structured output matching the schema", "");
    }
    // AI SDK wraps upstream errors as various classes; map to AiGatewayError.
    const err = e as
      | (Error & {
          status?: number;
          statusCode?: number;
          response?: { status?: number };
        })
      | undefined;
    let rawMessage = "AI gateway error";
    try {
      rawMessage = err?.message ?? (typeof e === "string" ? e : "AI gateway error");
    } catch {
      /* keep default */
    }
    // Map well-known error categories to the right HTTP status.
    // Missing config (VEXO_API_KEY) → 500 (server misconfigured)
    if (rawMessage.includes("VEXO_API_KEY")) {
      throw new AiGatewayError("AI gateway tidak dikonfigurasi", 500);
    }
    let status = 502;
    try {
      status = err?.status ?? err?.statusCode ?? err?.response?.status ?? 502;
    } catch {
      /* keep default 502 */
    }
    throw new AiGatewayError(`AI structured: ${rawMessage}`, status);
  }

  // ─── Extract typed object ───────────────────────────────────────────────
  if (!result.object) {
    if (opts.fallback !== undefined) return opts.fallback;
    throw new AiSchemaError(
      "AI did not produce a structured output matching the schema",
      JSON.stringify(result.object ?? null),
    );
  }

  // ─── Usage logging ──────────────────────────────────────────────────────
  void logAiUsage({
    userId: opts.userId,
    feature: opts.feature,
    model: opts.model ?? "google/gemini-2.5-flash",
    promptTokens: result.usage?.promptTokens ?? Math.ceil(opts.prompt.length / 4),
    completionTokens: result.usage?.completionTokens ?? 0,
  });

  return result.object as z.infer<S>;
}
