/**
 * Internal VexoAPI adapter — extracted from aiGateway.server.ts so the
 * streaming gateway can reuse the same call/parse/error path.
 *
 * Not exported from the public AI gateway barrel. Treat as private to
 * src/features/ai/lib/.
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
    const text = typeof m.content === "string"
      ? m.content
      : m.content
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("\n");
    const imageUrl = typeof m.content === "string"
      ? undefined
      : m.content.find((p) => p.type === "image_url")?.type === "image_url"
        ? (m.content.find((p) => p.type === "image_url") as { type: "image_url"; image_url: { url: string } })
            .image_url.url
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

  const prompt = historyParts.length > 0
    ? historyParts.join("\n") + `\n[user] ${lastUserText}`
    : lastUserText;

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

export async function callVexoApi(opts: {
  endpoint: string;
  text: string;
  system?: string;
  imageUrl?: string;
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<{ data: string; latencyMs: number }> {
  const apiKey = process.env.VEXO_API_KEY;
  if (!apiKey) throw new VexoApiCallError("VEXO_API_KEY missing", 500);

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
  params.set("temperature", "0.3");

  const url = `${VEXO_BASE_URL}/api/${opts.endpoint}?${params.toString()}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  const start = Date.now();
  let res: Response;
  try {
    res = await fetch(url, { method: "GET", signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    const isAbort = (e as Error)?.name === "AbortError";
    throw new VexoApiCallError(
      isAbort ? "AI gateway timeout" : `AI gateway error: ${(e as Error).message}`,
      isAbort ? 504 : 502,
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
    throw new VexoApiCallError(
      `AI gateway ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
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
