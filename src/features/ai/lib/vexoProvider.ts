/**
 * VexoAPI → Vercel AI SDK provider bridge.
 *
 * Sprint 1c: wraps the existing VexoAPI (OpenAI-compatible) endpoint with the
 * Vercel AI SDK's `createOpenAICompatible` provider so we get:
 *   - Type-safe `generateText`, `streamText`, `generateObject` calls
 *   - Real SSE streaming (VexoAPI does support stream=true via this adapter)
 *   - Native Zod-driven structured output (no more prompt-hack JSON mode)
 *   - Provider abstraction: future swap to OpenAI/Anthropic is a 1-line change
 *
 * Public surface:
 *   - vexoModel(name)  → VexoLanguageModel for use with generateText/streamText
 *   - vexoChatModel()  → default chat model (gpt-oss-120b:free)
 *   - resolveVexoModelName(name) → string (delegates to existing resolver)
 *
 * Backward-compat:
 *   - Public API of `aiGateway.server.ts` and `aiStreamGateway.server.ts`
 *     is UNCHANGED. Old callers keep working through `vexoAdapter.server.ts`.
 *   - New callers SHOULD prefer this module for new code.
 *
 * Reference: https://ai-sdk.dev/providers/openai-compatible-providers
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getEnv } from "@/lib/cloudflare-env.server";
import { resolveVexoEndpoint } from "./vexoAdapter.server";

/**
 * Read Vexo base URL from CF env (AsyncLocalStorage) or process.env.
 * Mirrors the resolver in `vexoAdapter.server.ts` — keep them in sync.
 */
function readVexoBaseUrl(): string {
  return getEnv().VEXO_BASE_URL || "https://vexoapi.site";
}

/**
 * Create the VexoAI provider instance. Lazy-initialized on first call so
 * we don't fetch env at import time (test-friendly + CF Workers cold start).
 */
let _provider: ReturnType<typeof createOpenAICompatible> | null = null;
function getProvider(): ReturnType<typeof createOpenAICompatible> {
  if (_provider) return _provider;
  const apiKey = getEnv().VEXO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "VEXO_API_KEY is not configured. Set it in your CF Worker env vars or .env.local.",
    );
  }
  // Vercel AI SDK's OpenAI-compatible provider hardcodes path `/chat/completions`
  // and appends it to `baseURL`. VexoAPI serves that path under `/api/v1/`, so
  // we append the prefix here. The `vexoAdapter.server.ts` direct caller
  // already adds `/api/v1/chat/completions` itself, so it must keep using
  // the un-suffixed `readVexoBaseUrl()`.
  const baseURL = readVexoBaseUrl().replace(/\/+$/, "") + "/api/v1";
  _provider = createOpenAICompatible({
    name: "vexo",
    baseURL,
    apiKey,
    // VexoAPI uses `Authorization: Bearer <key>` by default; the SDK handles it.
    // We don't need a custom fetch wrapper — the OpenAI-compat path is sufficient.
  });
  return _provider;
}

/**
 * Resolve a model name and return the SDK's language model instance.
 *
 * @example
 * ```ts
 * const { text } = await generateText({
 *   model: vexoModel("gptoss120b"),
 *   prompt: "Halo, apa kabar?",
 * });
 * ```
 */
export function vexoModel(model: string) {
  const endpoint = resolveVexoEndpoint(model);
  return getProvider().chatModel(endpoint);
}

/**
 * Default chat model (cheap + fast for most tasks).
 * Same default as `callAiWithGuards` in `aiGateway.server.ts`.
 */
export function vexoChatModel() {
  return vexoModel("google/gemini-2.5-flash");
}

/**
 * Whether VexoAPI is configured. Used by `aiProviders.ts` registry to
 * skip VexoAPI and route to other providers when key is missing.
 */
export function isVexoConfigured(): boolean {
  return Boolean(getEnv().VEXO_API_KEY);
}

/**
 * Resolve a model name to its upstream Vexo endpoint string.
 * Re-export so SDK-based callers don't have to import from vexoAdapter.
 */
export { resolveVexoEndpoint as resolveVexoModelName };
