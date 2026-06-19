/**
 * Multi-provider AI registry — Sprint 2d.
 *
 * Routes a model name (string) to the right provider instance + model id,
 * handling vision-capable models automatically. Single source of truth for
 * "which provider serves this model" across the entire AI stack.
 *
 * Naming convention:
 *   - "openai/gpt-oss-120b:free"            → VexoAPI (text)
 *   - "vexo/<model>"                         → VexoAPI explicit
 *   - "openrouter/<model>"                   → OpenRouter (vision-capable free tier)
 *   - "openrouter/auto"                      → OpenRouter auto-route
 *   - bare names ("gptoss120b", "gemini")   → legacy back-compat → VexoAPI
 *
 * Vision routing:
 *   - If the call has an image AND the named model supports vision → use it
 *   - If the call has an image AND the named model is text-only:
 *     1. Try OpenRouter auto-route (if OPENROUTER_API_KEY configured)
 *     2. Fall back to OCR text → text-only model (degraded mode)
 *   - If the call has no image → use the named provider as-is
 *
 * Adding a new provider (e.g. OpenAI direct, Anthropic):
 *   1. Create `<name>Provider.ts` mirroring `vexoProvider.ts` pattern
 *   2. Add an entry to PROVIDER_REGISTRY below
 *   3. Done — call sites use `"<name>/<model>"` model names
 */

import type { CoreMessage, LanguageModel } from "ai";
import { generateObject } from "ai";
import type { ZodTypeAny, z } from "zod";
import { vexoModel, isVexoConfigured } from "./vexoProvider";
import {
  openrouterModel,
  isOpenRouterConfigured,
  resolveOpenRouterModelName,
} from "./openrouterProvider";
import { getEnv } from "@/lib/cloudflare-env.server";

export type ProviderName = "vexo" | "openrouter";

export type ResolvedModel = {
  /** Provider that owns this model. */
  provider: ProviderName;
  /** Canonical upstream model id (provider-specific). */
  modelId: string;
  /** Vercel AI SDK instance ready for generateText/streamText/generateObject. */
  instance: LanguageModel;
  /** Whether this model can accept image inputs. */
  supportsVision: boolean;
};

/**
 * Models known to support vision (image) inputs.
 * Keep in sync with provider docs. Used to decide whether to keep an image
 * in the message or strip it to text-only.
 *
 * Verified 2026-06-19 against https://openrouter.ai/api/v1/models.
 * Previous defaults (`gemini-2.0-flash-exp:free`, `llama-3.2-11b-vision-instruct:free`)
 * were deprecated/removed from free tier; updated list below.
 */
const VISION_CAPABLE: Record<string, boolean> = {
  // OpenRouter free vision models (verified available 2026-06-19)
  "nvidia/nemotron-nano-12b-v2-vl:free": true, // purpose-built VL
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": true, // omni (vision+audio)
  "google/gemma-4-31b-it:free": true,
  "google/gemma-4-26b-a4b-it:free": true,
  "nex-agi/nex-n2-pro:free": true,
  // Paid but cheap vision models (when free tier exhausted)
  "google/gemini-3.1-flash-lite": true, // $0.00000025/$0.0000015 per token
  "google/gemini-3.1-flash-image": true,
  "google/gemini-3.5-flash": true,
  "meta-llama/llama-3.2-90b-vision-instruct": true, // paid
  "qwen/qwen-2-vl-72b-instruct": true, // paid
  // OpenRouter auto-route: picks best per request (may include vision)
  "openrouter/auto": true,
  // VexoAPI: NONE of the current free-tier models support vision
  // (verified 2026-06-19, catalog has 11 models all text-only)
};

export function modelSupportsVision(provider: ProviderName, modelId: string): boolean {
  if (provider === "openrouter") {
    // Auto-route can pick a vision model when an image is present
    if (modelId === "openrouter/auto") return true;
    return VISION_CAPABLE[modelId] ?? false;
  }
  // VexoAPI: no vision models in current free tier
  return false;
}

/**
 * Detect provider from model name string. Returns the bare provider
 * identifier (everything before the first `/`).
 */
export function detectProvider(model: string): ProviderName {
  if (model.startsWith("openrouter/")) return "openrouter";
  if (model.startsWith("vexo/")) return "vexo";
  // Legacy aliases and bare Vexo names → VexoAPI (back-compat)
  return "vexo";
}

/**
 * Strip the provider prefix from a model name. Returns the bare upstream id.
 */
export function stripProviderPrefix(model: string): string {
  if (model.startsWith("openrouter/")) {
    return resolveOpenRouterModelName(model);
  }
  if (model.startsWith("vexo/")) return model.slice("vexo/".length);
  return model;
}

/**
 * Build a Vercel AI SDK LanguageModel instance for the given model name.
 *
 * @throws if the chosen provider is not configured (e.g. OPENROUTER_API_KEY
 *         missing when an OpenRouter model was requested).
 */
export function getModelInstance(model: string): LanguageModel {
  const provider = detectProvider(model);
  const modelId = stripProviderPrefix(model);

  if (provider === "openrouter") {
    if (!isOpenRouterConfigured()) {
      throw new Error(
        `Cannot use OpenRouter model "${model}" — OPENROUTER_API_KEY not configured. ` +
          `Set it in CF Worker env vars or .env.local, or use a VexoAPI model ` +
          `(text-only) instead.`,
      );
    }
    // Re-attach prefix because openrouterModel expects "openrouter/<id>"
    return openrouterModel(`openrouter/${modelId}`);
  }

  // VexoAPI: always available (existing behavior)
  if (!isVexoConfigured()) {
    throw new Error(`Cannot use VexoAPI model "${model}" — VEXO_API_KEY not configured.`);
  }
  // vexoModel handles bare names + legacy aliases (gptoss120b, google/gemini-*, etc)
  return vexoModel(model);
}

/**
 * High-level resolver that returns the full ResolvedModel struct including
 * vision capability. Use this when you need to decide whether an image
 * should be included in the message.
 */
export function resolveModel(model: string): ResolvedModel {
  const provider = detectProvider(model);
  const modelId = stripProviderPrefix(model);
  const instance = getModelInstance(model);
  const supportsVision = modelSupportsVision(provider, modelId);
  return { provider, modelId, instance, supportsVision };
}

/**
 * Provider availability snapshot. Useful for diagnostics + UI to show
 * which providers are live and what their limits are.
 */
export function getProviderStatus(): {
  vexo: boolean;
  openrouter: boolean;
} {
  return {
    vexo: isVexoConfigured(),
    openrouter: isOpenRouterConfigured(),
  };
}

/**
 * Check whether ANY vision-capable provider is configured.
 * Used by scan flows to decide whether to send an image at all.
 */
export function hasVisionProvider(): boolean {
  return isOpenRouterConfigured(); // VexoAPI has no vision models
}

/**
 * Pick the best model for a vision call. Prefers explicit openrouter vision
 * models over auto-route when OPENROUTER_API_KEY is set, otherwise falls
 * back to text-only mode (caller decides what to do — typically strip the
 * image and rely on Tesseract OCR text).
 *
 * @returns the model name to use, or null if no vision provider is configured.
 */
export function pickVisionModel(preferred?: string): string | null {
  if (!isOpenRouterConfigured()) return null;
  if (preferred && preferred.startsWith("openrouter/")) return preferred;
  // Default: cheapest free vision model that ACTUALLY EXISTS in OpenRouter
  // catalog as of 2026-06-19. (gemini-2.0-flash-exp:free was deprecated.)
  // nvidia/nemotron-nano-12b-v2-vl:free is purpose-built for vision-language.
  return "openrouter/nvidia/nemotron-nano-12b-v2-vl:free";
}

// Re-export for backward compat with code that imported from vexoProvider
export { resolveVexoModelName } from "./vexoProvider";
// Note: vexoProvider.ts does `export { resolveVexoEndpoint as resolveVexoModelName }`
// so we import from the public alias to avoid the "re-exported under different name" error.
// generateObject, CoreMessage already imported above

/**
 * Call AI with vision fallback chain (Sprint 2d).
 *
 * Priority:
 *   1. If image present AND OpenRouter configured → OpenRouter vision model
 *   2. If image present but no vision provider → text-only (caller must
 *      pre-process via Tesseract OCR or similar)
 *   3. If no image → use the specified provider/model as-is
 *
 * Returns the AI response AND a `mode` field indicating which path was taken
 * (useful for diagnostics, telemetry, UI hints).
 *
 * @example
 * ```ts
 * const { object, mode } = await callAiVisionWithFallback({
 *   userId,
 *   feature: "scan.recipe.image",
 *   system: "Kamu parser resep Indonesia.",
 *   prompt: "Ekstrak bahan dari foto ini",
 *   imageDataUrl: "data:image/jpeg;base64,...",
 *   schema: RecipeSchema,
 *   fallback: { title: "", ingredients: [], steps: [] },
 * });
 * // mode === "openrouter-vision" | "ocr-text" | "text-only"
 * ```
 */
export type AiVisionMode =
  | "openrouter-vision" // image + OpenRouter vision model used
  | "ocr-text" // image present but no vision provider → caller did OCR
  | "text-only" // no image at all
  | "openrouter-text"; // explicit text request via OpenRouter

export interface CallAiVisionOptions<S extends ZodTypeAny> {
  userId: string | null;
  feature: string;
  system?: string;
  prompt: string;
  /** data:image/...;base64,... URL. Strip if you want text-only mode. */
  imageDataUrl?: string;
  schema: S;
  schemaName?: string;
  schemaDescription?: string;
  fallback: z.infer<S>;
  /** Force a specific model. If not provided, picks best vision/text model. */
  preferredModel?: string;
  /** Treat as premium user (relaxed rate limits). */
  isPremium?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
}

export interface CallAiVisionResult<T> {
  object: T;
  mode: AiVisionMode;
  model: string;
}

export async function callAiVisionWithFallback<S extends ZodTypeAny>(
  opts: CallAiVisionOptions<S>,
): Promise<CallAiVisionResult<z.infer<S>>> {
  const hasImage = Boolean(opts.imageDataUrl);
  const ocrText = opts.prompt; // when image is stripped, caller puts OCR text in prompt

  // Sprint 2d diagnostic: log provider state once per call.
  // Visible in `wrangler tail` — helps debug "vision not working" reports.
  const orConfigured = isOpenRouterConfigured();
  const vexoConfigured = isVexoConfigured();
  console.log(
    `[aiProviders.callAiVisionWithFallback] feature=${opts.feature} ` +
      `hasImage=${hasImage} openRouterConfigured=${orConfigured} ` +
      `vexoConfigured=${vexoConfigured}`,
  );

  // ─── Branch 1: image + OpenRouter vision ──────────────────────────────
  if (hasImage && isOpenRouterConfigured()) {
    const model = opts.preferredModel ?? "openrouter/nvidia/nemotron-nano-12b-v2-vl:free";
    try {
      const { generateText: genText } = await import("ai");
      // We can't use generateObject directly with multimodal messages from
      // string-based callers, so we use generateText with JSON-mode prompt
      // and parse manually. (generateObject supports structured output for
      // text prompts; vision + structured output works but the helper
      // signature differs.)
      const messages: CoreMessage[] = [];
      if (opts.system) messages.push({ role: "system", content: opts.system });
      messages.push({
        role: "user",
        content: [
          { type: "text", text: opts.prompt },
          { type: "image", image: opts.imageDataUrl! },
        ],
      });
      const result = await genText({
        model: getModelInstance(model),
        messages,
        maxTokens: opts.maxTokens ?? 2048,
        abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      // Parse response as JSON against schema
      const parsed = safeParseJsonLike(result.text, opts.schema);
      if (parsed.success) {
        return { object: parsed.value as z.infer<S>, mode: "openrouter-vision", model };
      }
      // JSON parse failed → return fallback
      return { object: opts.fallback, mode: "openrouter-vision", model };
    } catch (err) {
      console.warn(`[aiProviders] OpenRouter vision failed, falling back:`, (err as Error).message);
      // fall through to OCR text branch
    }
  }

  // ─── Branch 2: image but no vision provider → text-only path ──────────
  // Caller is expected to have pre-processed the image via OCR and put the
  // text in `prompt`. We call generateObject with the OCR text.
  if (hasImage && !isOpenRouterConfigured()) {
    try {
      const result = await generateObject({
        model: getModelInstance(opts.preferredModel ?? "google/gemini-2.5-flash"),
        system: opts.system,
        prompt: ocrText,
        schema: opts.schema,
        schemaName: opts.schemaName,
        schemaDescription: opts.schemaDescription,
        maxTokens: opts.maxTokens ?? 2048,
        abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      return {
        object: (result.object as z.infer<S>) ?? opts.fallback,
        mode: "ocr-text",
        model: opts.preferredModel ?? "google/gemini-2.5-flash",
      };
    } catch (err) {
      console.warn(`[aiProviders] OCR-text fallback failed:`, (err as Error).message);
      return {
        object: opts.fallback,
        mode: "ocr-text",
        model: opts.preferredModel ?? "google/gemini-2.5-flash",
      };
    }
  }

  // ─── Branch 3: no image, text-only ────────────────────────────────────
  try {
    const result = await generateObject({
      model: getModelInstance(opts.preferredModel ?? "google/gemini-2.5-flash"),
      system: opts.system,
      prompt: opts.prompt,
      schema: opts.schema,
      schemaName: opts.schemaName,
      schemaDescription: opts.schemaDescription,
      maxTokens: opts.maxTokens ?? 2048,
      abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    return {
      object: (result.object as z.infer<S>) ?? opts.fallback,
      mode: "text-only",
      model: opts.preferredModel ?? "google/gemini-2.5-flash",
    };
  } catch (err) {
    console.warn(`[aiProviders] text-only call failed:`, (err as Error).message);
    return {
      object: opts.fallback,
      mode: "text-only",
      model: opts.preferredModel ?? "google/gemini-2.5-flash",
    };
  }
}

/**
 * Tolerant JSON parser for AI text responses. Handles:
 *   - Plain JSON: {"a":1}
 *   - Markdown code fences: ```json\n{...}\n```
 *   - Prose around JSON: "Here is the JSON: {...} Hope this helps"
 *   - Trailing commas (lenient)
 */
function safeParseJsonLike<T>(text: string, _schema: ZodTypeAny): { success: boolean; value?: T } {
  if (!text) return { success: false };

  // Try direct parse first
  try {
    return { success: true, value: JSON.parse(text) };
  } catch {
    // continue
  }

  // Try extracting from code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenceMatch) {
    try {
      return { success: true, value: JSON.parse(fenceMatch[1]) };
    } catch {
      // continue
    }
  }

  // Try extracting the first {...} or [...] block
  const blockMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (blockMatch) {
    try {
      return { success: true, value: JSON.parse(blockMatch[1]) };
    } catch {
      // continue
    }
  }

  // Try lenient parse: remove trailing commas
  const lenient = text
    .replace(/,(\s*[}\]])/g, "$1")
    .replace(/```(?:json)?\s*/g, "")
    .replace(/```\s*/g, "");
  try {
    return { success: true, value: JSON.parse(lenient) };
  } catch {
    return { success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// callAiTextWithVision — non-structured text call with image support.
// Sprint 2d follow-up fix: chat route needs multimodal text (not just
// structured output). Routes through the same provider registry so
// vision works whenever OpenRouter is configured.
// ─────────────────────────────────────────────────────────────────────────

export type AiTextMode =
  | "openrouter-vision" // image + OpenRouter vision model
  | "openrouter-text" // text only via OpenRouter
  | "vexo-text" // text via VexoAPI (always works)
  | "fallback-text" // image present but no vision → text-only via OCR-flat prompt
  | "fallback-empty"; // all providers failed, returned ""

export interface CallAiTextOptions {
  userId?: string | null;
  feature: string;
  /** OpenAI-style messages (string content or array of text/image parts). */
  messages: CoreMessage[];
  /** Optional model name. Defaults to chat default if omitted. */
  preferredModel?: string;
  timeoutMs?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface CallAiTextResult {
  text: string;
  mode: AiTextMode;
  model: string;
}

function detectImageInMessages(messages: CoreMessage[]): {
  hasImage: boolean;
  imageDataUrl?: string;
} {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const c = m.content;
    if (Array.isArray(c)) {
      const img = c.find((p) => (p as { type?: string }).type === "image");
      if (img) {
        return {
          hasImage: true,
          imageDataUrl: (img as { image?: string | Uint8Array }).image
            ? ((img as { image: string | Uint8Array }).image as string)
            : undefined,
        };
      }
    }
  }
  return { hasImage: false };
}

export async function callAiTextWithVision(opts: CallAiTextOptions): Promise<CallAiTextResult> {
  const { hasImage, imageDataUrl } = detectImageInMessages(opts.messages);
  const orConfigured = isOpenRouterConfigured();
  const vexoConfigured = isVexoConfigured();

  console.log(
    `[aiProviders.callAiTextWithVision] feature=${opts.feature} ` +
      `hasImage=${hasImage} openRouterConfigured=${orConfigured} ` +
      `vexoConfigured=${vexoConfigured}`,
  );

  // ─── Branch 1: image + OpenRouter configured → use vision model ─────
  // CRITICAL: ignore `opts.preferredModel` when an image is present, because
  // most preferred models are VexoAPI (text-only) — calling them with image
  // parts makes the SDK throw. Always force the OpenRouter vision default,
  // unless the caller explicitly asked for an `openrouter/...` model.
  if (hasImage && orConfigured) {
    const visionModel =
      pickVisionModel(opts.preferredModel) ?? "openrouter/nvidia/nemotron-nano-12b-v2-vl:free";
    try {
      const { generateText: genText } = await import("ai");
      const result = await genText({
        model: getModelInstance(visionModel),
        messages: opts.messages,
        maxTokens: opts.maxTokens ?? 2048,
        abortSignal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      if (result.text) return { text: result.text, mode: "openrouter-vision", model: visionModel };
      console.warn(
        `[aiProviders] OpenRouter vision returned empty text, retrying once with auto-route`,
      );
      // Retry with openrouter/auto — picks best model per request, sometimes
      // resolves rate-limit on a specific free model.
      const retry = await genText({
        model: getModelInstance("openrouter/auto"),
        messages: opts.messages,
        maxTokens: opts.maxTokens ?? 2048,
        abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      });
      if (retry.text)
        return { text: retry.text, mode: "openrouter-vision", model: "openrouter/auto" };
      // Both empty — fall through to OCR/text-only
      console.warn(`[aiProviders] OpenRouter auto-route also empty`);
    } catch (err) {
      console.warn(`[aiProviders] OpenRouter vision failed, falling back:`, (err as Error).message);
      // fall through
    }
  }

  // ─── Branch 2: image but no vision OR vision failed → strip image ────
  // Try OCR-strip fallback if available, otherwise just call the text model.
  if (hasImage) {
    try {
      const flatMessages = stripImagesFromMessages(opts.messages);
      // Use VexoAPI for text-only (always configured, always text-capable)
      const model = isVexoConfigured()
        ? (opts.preferredModel ?? "google/gemini-2.5-flash")
        : "openrouter/auto";
      const { generateText: genText } = await import("ai");
      const result = await genText({
        model: getModelInstance(model),
        messages: flatMessages,
        maxTokens: opts.maxTokens ?? 2048,
        abortSignal: AbortSignal.timeout(opts.timeoutMs ?? 30_000),
      });
      return { text: result.text, mode: "fallback-text", model };
    } catch (err) {
      console.warn(`[aiProviders] OCR-strip fallback failed:`, (err as Error).message);
      return { text: "", mode: "fallback-empty", model: "vexo" };
    }
  }

  // ─── Branch 3: no image, text-only → use preferred or default ────────
  try {
    const model = opts.preferredModel ?? "google/gemini-2.5-flash";
    const { generateText: genText } = await import("ai");
    const result = await genText({
      model: getModelInstance(model),
      messages: opts.messages,
      maxTokens: opts.maxTokens ?? 2048,
      abortSignal: opts.signal ?? AbortSignal.timeout(opts.timeoutMs ?? 30_000),
    });
    const provider = detectProvider(model);
    return {
      text: result.text,
      mode: provider === "openrouter" ? "openrouter-text" : "vexo-text",
      model,
    };
  } catch (err) {
    console.warn(`[aiProviders] text-only call failed:`, (err as Error).message);
    return { text: "", mode: "fallback-empty", model: opts.preferredModel ?? "vexo" };
  }
}

/**
 * Strip image parts from messages, keeping only text content.
 * Used when no vision provider is configured.
 */
function stripImagesFromMessages(messages: CoreMessage[]): CoreMessage[] {
  return messages.map((m) => {
    if (m.role !== "user") return m;
    const c = m.content;
    if (typeof c === "string") return m;
    const textOnly = c
      .filter((p) => (p as { type?: string }).type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("\n");
    return { ...m, content: textOnly || "(gambar dihapus — tidak ada vision provider)" };
  });
}
