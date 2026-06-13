/**
 * Internal VexoAPI adapter — extracted from aiGateway.server.ts so the
 * streaming gateway can reuse the same call/parse/error path.
 *
 * Not exported from the public AI gateway barrel. Treat as private to
 * src/features/ai/lib/.
 *
 * Hardening notes:
 *   - 5xx and 429 responses are retried with exponential backoff
 *     (default: 2 attempts, 200ms → 800ms).
 *   - Input text > MAX_TEXT_CHARS is rejected before hitting the API
 *     to avoid wasting tokens and to surface prompt-too-long errors
 *     at the boundary.
 *   - Each request gets a short x-request-id header (when supported)
 *     and is logged with its endpoint + latency for traceability.
 */

const VEXO_BASE_URL = process.env.VEXO_BASE_URL || "https://vexoapi.dev";

const MODEL_TO_VEXO_ENDPOINT: Record<string, string> = {
  "google/gemini-2.5-flash": "gptoss120b",
  "google/gemini-2.5-flash-lite": "glm47flash",
  "google/gemini-2.5-pro": "gemini",
  "google/gemini-3-flash-preview": "gptoss120b",
  gptoss120b: "gptoss120b",
  glm47flash: "glm47flash",
  gemini: "gemini",
};

export function resolveVexoEndpoint(model: string): string {
  return MODEL_TO_VEXO_ENDPOINT[model] ?? "gptoss120b";
}

export function endpointSupportsImage(endpoint: string): boolean {
  return endpoint === "gemini";
}

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export type AiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "input_audio"; input_audio: { data: string; format: string } };

export type AiMultimodalMessage = {
  role: "system" | "user" | "assistant";
  content: string | AiContentPart[];
};

export function flattenMessages(messages: AiMultimodalMessage[]): {
  text: string;
  system: string;
  imageUrl?: string;
} {
  const systemParts: string[] = [];
  const historyParts: string[] = [];
  let lastUserText = "";
  let lastUserImage: string | undefined;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const isLast = i === messages.length - 1;
    const text =
      typeof m.content === "string"
        ? m.content
        : m.content
            .filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("\n");
    const imageUrl =
      typeof m.content === "string"
        ? undefined
        : m.content.find((p) => p.type === "image_url")?.type === "image_url"
          ? (
              m.content.find((p) => p.type === "image_url") as {
                type: "image_url";
                image_url: { url: string };
              }
            ).image_url.url
          : undefined;

    if (m.role === "system") {
      systemParts.push(text);
      continue;
    }

    if (isLast && m.role === "user") {
      lastUserText = text;
      lastUserImage = imageUrl;
    } else {
      historyParts.push(`[${m.role}] ${text}`);
    }
  }

  const prompt =
    historyParts.length > 0 ? historyParts.join("\n") + `\n[user] ${lastUserText}` : lastUserText;

  return {
    text: prompt,
    system: systemParts.join("\n\n").trim(),
    imageUrl: lastUserImage,
  };
}

export class VexoApiCallError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "VexoApiCallError";
  }
}

// ──────────────────────────────────────────────────────────────────────
// Limits and defaults
// ──────────────────────────────────────────────────────────────────────

/** Maximum prompt text length accepted in a single call. Anything
 *  longer is rejected at the boundary (saves tokens + surfaces
 *  prompt-too-long errors early). 50KB is well within Gemini's
 *  ~1M-token context but protects against runaway input. */
export const MAX_TEXT_CHARS = 50_000;

/** Maximum system prompt length. */
export const MAX_SYSTEM_CHARS = 4_000;

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_BASE_BACKOFF_MS = 200;
const DEFAULT_TEMPERATURE = 0.3;

// ──────────────────────────────────────────────────────────────────────
// callVexoApi — the only thing callers should need
// ──────────────────────────────────────────────────────────────────────

export async function callVexoApi(opts: {
  endpoint: string;
  text: string;
  system?: string;
  imageUrl?: string;
  timeoutMs: number;
  signal?: AbortSignal;
  /** Total attempts including the first. 1 disables retries.
   *  Capped at 3 to keep worst-case latency bounded. */
  maxAttempts?: number;
  /** Override default temperature (0-1). */
  temperature?: number;
  /** Override base backoff (ms). Doubles each attempt. */
  baseBackoffMs?: number;
}): Promise<{ data: string; latencyMs: number; attempts: number; requestId: string }> {
  const apiKey = process.env.VEXO_API_KEY;
  if (!apiKey) throw new VexoApiCallError("VEXO_API_KEY missing", 500);

  // Input validation — fail fast, don't hit the API with garbage.
  if (typeof opts.text !== "string" || opts.text.length === 0) {
    throw new VexoApiCallError("callVexoApi: text must be a non-empty string", 400);
  }
  if (opts.text.length > MAX_TEXT_CHARS) {
    throw new VexoApiCallError(
      `callVexoApi: text exceeds ${MAX_TEXT_CHARS} chars (got ${opts.text.length})`,
      413,
    );
  }
  if (opts.system && opts.system.length > MAX_SYSTEM_CHARS) {
    throw new VexoApiCallError(
      `callVexoApi: system exceeds ${MAX_SYSTEM_CHARS} chars (got ${opts.system.length})`,
      413,
    );
  }
  if (opts.imageUrl && !endpointSupportsImage(opts.endpoint)) {
    throw new VexoApiCallError(
      `callVexoApi: imageUrl provided but endpoint "${opts.endpoint}" doesn't support images`,
      400,
    );
  }

  const maxAttempts = Math.min(Math.max(opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS, 1), 3);
  const baseBackoffMs = opts.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
  const temperature = clamp01(opts.temperature ?? DEFAULT_TEMPERATURE);
  const requestId = makeRequestId();

  const params = new URLSearchParams();
  params.set("key", apiKey);
  if (opts.endpoint === "gemini" && opts.system) {
    params.set("promptSystem", opts.system);
  } else if (opts.system) {
    params.set("system", opts.system);
  }
  params.set("text", opts.text);
  if (opts.endpoint === "gemini" && opts.imageUrl) {
    params.set("imageUrl", opts.imageUrl);
  }
  params.set("temperature", String(temperature));

  const url = `${VEXO_BASE_URL}/api/${opts.endpoint}?${params.toString()}`;

  let lastError: VexoApiCallError | null = null;
  const start = Date.now();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await attemptOnce(url, opts.timeoutMs, opts.signal, requestId, attempt);
      return { ...result, attempts: attempt, requestId };
    } catch (e) {
      if (e instanceof VexoApiCallError) {
        lastError = e;
        // Don't retry on caller errors (4xx except 429) or timeout
        // (caller's signal already aborted, no point retrying).
        const isCallerError = e.status >= 400 && e.status < 500 && e.status !== 429;
        if (isCallerError || attempt === maxAttempts || opts.signal?.aborted) {
          throw e;
        }
        // Transient: 5xx or 429 — back off with jitter
        const backoff = baseBackoffMs * 2 ** (attempt - 1) + Math.random() * 100;
        await sleep(backoff, opts.signal);
        continue;
      }
      throw e;
    }
  }

  // Should be unreachable (loop either returns or throws), but
  // satisfy the type checker.
  throw lastError ?? new VexoApiCallError("callVexoApi: exhausted attempts", 502);

  function clamp01(n: number): number {
    if (!Number.isFinite(n)) return DEFAULT_TEMPERATURE;
    return Math.min(1, Math.max(0, n));
  }
}

// ──────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────

async function attemptOnce(
  url: string,
  timeoutMs: number,
  parentSignal: AbortSignal | undefined,
  requestId: string,
  attempt: number,
): Promise<{ data: string; latencyMs: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort("timeout"), timeoutMs);
  if (parentSignal) {
    if (parentSignal.aborted) {
      clearTimeout(timer);
      throw new VexoApiCallError("Caller aborted before send", 499);
    }
    parentSignal.addEventListener("abort", () => ctrl.abort("caller-abort"), { once: true });
  }

  const start = Date.now();
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { "x-request-id": requestId, "x-attempt": String(attempt) },
    });
  } catch (e) {
    clearTimeout(timer);
    const reason = (ctrl.signal as AbortSignal & { reason?: unknown }).reason;
    const isAbort = (e as Error)?.name === "AbortError";
    const isTimeout = reason === "timeout" || (isAbort && !parentSignal?.aborted);
    throw new VexoApiCallError(
      isTimeout ? "AI gateway timeout" : `AI gateway error: ${(e as Error).message}`,
      isTimeout ? 504 : 502,
    );
  }
  clearTimeout(timer);
  const latencyMs = Date.now() - start;

  if (res.status === 429) throw new VexoApiCallError("AI gateway rate-limited", 429);
  if (res.status === 402) throw new VexoApiCallError("Kredit AI habis", 402);
  if (res.status === 403) {
    throw new VexoApiCallError(
      "AI gateway upstream ditolak (cek VEXO_API_KEY atau status upstream)",
      503,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new VexoApiCallError(`AI gateway ${res.status}: ${body.slice(0, 200)}`, res.status);
  }

  const json = (await res.json().catch(() => null)) as {
    status?: boolean | number;
    data?: string | { result?: string; text?: string; response?: string; output?: string };
    error?: string;
    message?: string;
  } | null;

  if (!json) throw new VexoApiCallError("AI gateway returned invalid JSON", 502);
  if (json.status === false || json.status === 0) {
    throw new VexoApiCallError(
      json.error || json.message || "AI gateway returned status:false",
      502,
    );
  }

  let text: string;
  if (typeof json.data === "string") {
    text = json.data;
  } else if (json.data && typeof json.data === "object") {
    const d = json.data as Record<string, unknown>;
    text =
      (typeof d.result === "string" ? d.result : null) ??
      (typeof d.text === "string" ? d.text : null) ??
      (typeof d.response === "string" ? d.response : null) ??
      (typeof d.output === "string" ? d.output : null) ??
      "";
  } else {
    text = "";
  }

  return { data: text, latencyMs };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new VexoApiCallError("Caller aborted during backoff", 499));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new VexoApiCallError("Caller aborted during backoff", 499));
      },
      { once: true },
    );
  });
}

function makeRequestId(): string {
  // 6 bytes hex = 12 chars, sufficient for tracing
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
