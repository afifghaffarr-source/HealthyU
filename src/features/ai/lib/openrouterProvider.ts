/**
 * OpenRouter → Vercel AI SDK provider bridge.
 *
 * Sprint 2d: parallel provider alongside `vexoProvider.ts`. Both expose the
 * same shape (`<name>Model(id)`, `<name>ChatModel()`, `resolve<Name>ModelName`)
 * so callers can switch providers via model name convention:
 *
 *   - "openai/gpt-oss-120b:free"           → VexoAPI (text, default)
 *   - "vexo/llama-3.1-8b-instant"          → VexoAPI explicit prefix
 *   - "openrouter/google/gemini-2.0-flash-exp:free"
 *                                            → OpenRouter (vision capable)
 *   - "openrouter/auto"                     → OpenRouter picks best per request
 *
 * OpenRouter specifics:
 *   - OpenAI-compatible endpoint at https://openrouter.ai/api/v1
 *   - Free tier: 50 req/day shared across all `:free` models (no payment)
 *   - With $10 top-up: 1000 req/day for `:free` models, plus pay-as-you-go
 *     for non-free models
 *   - Vision support: gemini-2.0-flash-exp:free, llama-3.2-11b-vision-instruct:free,
 *     qwen-2-vl-7b-instruct:free, google/gemini-2.5-flash (paid)
 *
 * Set OPENROUTER_API_KEY in Cloudflare Workers dashboard (encrypted secret).
 * When absent, OpenRouter calls fail fast and we transparently fall back to
 * VexoAPI text-only path (handled by aiProviders.ts multi-provider registry).
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/cloudflare-env.server";

/**
 * Read OpenRouter base URL from CF env (AsyncLocalStorage) or process.env.
 * Mirrors the resolver pattern in `vexoProvider.ts`.
 */
function readOpenRouterBaseUrl(): string {
  return getEnv().OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
}

/**
 * OpenRouter-friendly app attribution. OpenRouter shows this in their
 * public leaderboard. Free tier still works without it but it's good
 * citizenship.
 */
function readSiteUrl(): string {
  return getEnv().VITE_SITE_URL || "https://healthyu.web.id";
}

/**
 * Create the OpenRouter provider instance. Lazy-initialized on first call so
 * we don't fetch env at import time (test-friendly + CF Workers cold start).
 */
let _provider: ReturnType<typeof createOpenAICompatible> | null = null;
function getProvider(): ReturnType<typeof createOpenAICompatible> {
  if (_provider) return _provider;
  const apiKey = getEnv().OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured. Set it in CF Worker env vars or .env.local.",
    );
  }
  _provider = createOpenAICompatible({
    name: "openrouter",
    baseURL: readOpenRouterBaseUrl(),
    apiKey,
    // OpenRouter recommends sending these headers for app attribution
    // and to receive free-tier models in the routing pool.
    headers: {
      "HTTP-Referer": readSiteUrl(),
      "X-Title": "HealthyU",
    },
  });
  return _provider;
}

/**
 * Resolve an OpenRouter model id (the part after "openrouter/").
 * Returns the canonical model id as expected by the OpenRouter API.
 *
 * Handles the "openrouter/auto" shortcut which lets OpenRouter pick the
 * cheapest model that satisfies the request (vision/text/etc).
 *
 * @example
 * ```ts
 * resolveOpenRouterModelName("openrouter/auto")
 * // → "openrouter/auto"
 *
 * resolveOpenRouterModelName("openrouter/google/gemini-2.0-flash-exp:free")
 * // → "google/gemini-2.0-flash-exp:free"
 * ```
 */
export function resolveOpenRouterModelName(model: string): string {
  const stripped = model.startsWith("openrouter/") ? model.slice("openrouter/".length) : model;
  // Empty after strip → default to auto-route
  return stripped || "openrouter/auto";
}

/**
 * Resolve a model name and return the SDK's language model instance.
 *
 * @example
 * ```ts
 * const { text } = await generateText({
 *   model: openrouterModel("openrouter/google/gemini-2.0-flash-exp:free"),
 *   messages: [{ role: "user", content: [
 *     { type: "text", text: "Berapa kalori dalam gambar ini?" },
 *     { type: "image", image: base64DataUrl },
 *   ]}],
 * });
 * ```
 */
export function openrouterModel(model: string) {
  return getProvider().chatModel(resolveOpenRouterModelName(model));
}

/**
 * Default chat model on OpenRouter. Picks "openrouter/auto" which lets
 * OpenRouter route to the best available free model (handles vision + text).
 */
export function openrouterChatModel() {
  return openrouterModel("openrouter/auto");
}

/**
 * Whether OpenRouter is configured. Used by aiProviders.ts to decide
 * whether to route image-bearing prompts to OpenRouter (vision-capable)
 * or fall back to VexoAPI text-only path.
 */
export function isOpenRouterConfigured(): boolean {
  return Boolean(getEnv().OPENROUTER_API_KEY);
}
