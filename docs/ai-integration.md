# VexoAI Integration Guide

> **Status:** Active. Used in production by chat, recommendations, scan, coach, weekly report.
> **Last updated:** 2026-06-21 (Sprint 5a polish).
> **Postmortem reference:** `docs/postmortems/2026-06-19-chat-empty-reply.md`

HealthyU uses [VexoAPI](https://github.com/AzzamCyber/VexoAPI) (an OpenAI-compatible gateway) as the primary text/vision AI provider. This document explains how the integration is wired, which features use which path, and how to extend or debug it safely.

---

## TL;DR for new contributors

```ts
// For new text calls (preferred)
import { vexoChatModel } from "@/features/ai/lib/vexoProvider";
import { generateText } from "ai";

const { text } = await generateText({
  model: vexoChatModel(),
  prompt: "Halo, apa kabar?",
});

// For legacy code (still works, but uses direct fetch)
import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

const text = await callAiWithGuards({ messages: [{ role: "user", content: "..." }] });
```

⚠️ **Never** import VexoAPI directly. Always go through `@/features/ai/lib/*` so the budget tracker, image-fallback, and empty-response guards all run.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Feature code (chat, recommendations, scan, coach, weekly)      │
└─────────────────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Gateway layer (aiGateway.server.ts, aiStreamGateway.server.ts) │
│  • Budget enforcement (aiBudget.server.ts)                      │
│  • Caching (aiCache.server.ts)                                  │
│  • Error normalization (AiGatewayError)                          │
└─────────────────────────────────────────────────────────────────┘
                │
        ┌───────┴───────┐
        ▼               ▼
┌──────────────┐  ┌─────────────────────┐
│  Direct      │  │  Vercel AI SDK      │
│  fetch       │  │  (createOpenAI-     │
│  (legacy)    │  │   Compatible)       │
│              │  │  vexoProvider.ts    │
└──────────────┘  └─────────────────────┘
        │                       │
        └───────┬───────────────┘
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  VexoAPI  https://vexoapi.site/api/v1/chat/completions         │
│  (OpenAI-compatible chat completions endpoint)                  │
└─────────────────────────────────────────────────────────────────┘
```

There are **two call paths** to VexoAPI:

1. **Direct fetch** (`vexoAdapter.server.ts`) — used by `callAiWithGuards` and friends. Builds the URL manually as `${VEXO_BASE_URL}/api/v1/chat/completions`. This path was first, predates the SDK integration.
2. **Vercel AI SDK bridge** (`vexoProvider.ts`) — used by the chat streaming path, structured output, and any new code. The SDK hardcodes `/chat/completions` after `baseURL`, so we append `/api/v1` to the base URL ourselves.

Both paths share the same `VEXO_API_KEY` and `VEXO_BASE_URL` env vars.

---

## Environment variables

| Var             | Default                | Notes                                                    |
| --------------- | ---------------------- | -------------------------------------------------------- |
| `VEXO_API_KEY`  | (required)             | Personal API key. Stored in CF Worker env (not in repo). |
| `VEXO_BASE_URL` | `https://vexoapi.site` | Override for staging / local mock server.                |

Resolution order (in `vexoProvider.ts` and `vexoAdapter.server.ts`):

1. `getEnv().VEXO_BASE_URL` — pulled from CF Workers `env` binding via AsyncLocalStorage
2. `process.env.VEXO_BASE_URL` — for non-Worker contexts (tests, scripts)
3. `https://vexoapi.site` — fallback

The two resolver functions (`readVexoBaseUrl()` in `vexoProvider.ts` and the one in `vexoAdapter.server.ts`) must be kept in sync.

---

## The `/api/v1` gotcha

**This is the #1 source of integration bugs.** Both paths append `/api/v1` to the base URL before calling VexoAPI:

- Direct path builds `${baseURL}/api/v1/chat/completions` explicitly.
- SDK path appends `/api/v1` to `baseURL` because the SDK's `createOpenAICompatible` will hardcode `/chat/completions` after it.

If you bypass either layer and call VexoAPI directly from feature code, you will hit the **root domain parking page** and get a 404 + HTML body back. See `docs/postmortems/2026-06-19-chat-empty-reply.md` for the full story.

**Test rule:** if you write a feature that hits VexoAPI, assert the exact URL in a test (see `vexoProvider.test.ts` for the pattern).

---

## Feature → path map

| Feature               | Path                      | Why                                                                                               |
| --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| Chat streaming        | SDK via `vexoProvider.ts` | SSE streaming; needs `streamText` from AI SDK.                                                    |
| Coach meals           | SDK via `vexoProvider.ts` | Needs structured output (Zod schemas).                                                            |
| Weekly health report  | SDK via `vexoProvider.ts` | Streaming for long report generation.                                                             |
| Recommendations       | Direct fetch (legacy)     | Predates SDK integration; uses `callAiWithGuards` → `callVexoApi` in `vexoAdapter.server.ts:233`. |
| Scan (image)          | OpenRouter (not Vexo)     | Uses OpenRouter SDK for vision; OpenRouter has more reliable free vision models.                  |
| Profile summarization | Direct fetch (legacy)     | One-shot short text.                                                                              |
| TanStack start        | Direct fetch (legacy)     |                                                                                                   |
| Rate-limit / cache    | Both paths                | `aiBudget.server.ts` + `aiCache.server.ts` are call-site agnostic.                                |

---

## Public API

### Modern (prefer for new code)

```ts
import { vexoModel, vexoChatModel, isVexoConfigured } from "@/features/ai/lib/vexoProvider";
import { generateText, streamText, generateObject } from "ai";
import { z } from "zod";

// Plain text
const { text } = await generateText({
  model: vexoChatModel(),
  prompt: "...",
});

// Streaming
const { textStream } = await streamText({
  model: vexoChatModel(),
  prompt: "...",
});

// Structured output
const { object } = await generateObject({
  model: vexoChatModel(),
  schema: z.object({ foo: z.string() }),
  prompt: "...",
});
```

### Legacy (do not use in new code)

```ts
import { callAiWithGuards, callAiJsonWithGuards } from "@/features/ai/lib/aiGateway.server";

const text = await callAiWithGuards({
  messages: [{ role: "user", content: "..." }],
  maxTokens?: 2048,
  timeoutMs?: 30_000,
});
```

These still work and are wired to the same VexoAPI backend, but they go through the direct fetch path. Refactor to the SDK path when you touch the file for an unrelated reason (Sprint backlog item).

---

## Error handling

### `AiGatewayError`

Thrown by `callAiWithGuards` / `callAiJsonWithGuards` when:

- VEXO_API_KEY missing
- 5xx from VexoAPI
- 403 from VexoAPI (key may be rate-limited upstream)
- Timeout exceeded

### `VexoApiCallError`

Lower-level error from `vexoAdapter.server.ts`. Feature code should catch `AiGatewayError`, not `VexoApiCallError`.

### Empty response handling

`aiGateway.server.ts` swallows errors in some code paths (e.g. `callAiTextWithVision` Branch 3) and returns `{ data: "" }` to the caller. The chat SSE layer in `routes/api/chat.stream.ts` converts this into a `done {}` event with no text.

**The chat UI** (`features/chat/routes/ChatPage.tsx`) handles this case with:

1. A user-friendly error toast via `onError` mutation hook
2. A `reportError(...)` telemetry event with `source: "chat.ai.empty_response"`
3. Two separate branches: empty + explicit upstream error, and empty + no error

If you're building a new feature that uses VexoAPI, **do the same thing**: don't let an empty response silently succeed. Always throw or show a fallback.

---

## Cost & safety guards

| Guard             | Where                            | What it does                                                |
| ----------------- | -------------------------------- | ----------------------------------------------------------- |
| Budget cap        | `aiBudget.server.ts`             | Per-user daily token limit. Throws `AiBudgetExceededError`. |
| Rate limiting     | `src/lib/rateLimit.ts`           | Per-IP / per-user request limit. Throws 429.                |
| PII detection     | `src/lib/pii.ts` + `piiAudit.ts` | Warns before sending; audit-logs the consent.               |
| Caching           | `aiCache.server.ts`              | 1-hour cache for identical prompts (deterministic content). |
| Empty-response UX | `ChatPage.tsx` + `reportError`   | Surfaces a friendly error + telemetry on empty streams.     |

All four are non-negotiable for new features. If you skip one, document why in the PR.

---

## Telemetry & observability

Empty-response events go through `reportError` (in `src/lib/errorReporting.ts`):

```ts
reportError(
  new Error("AI stream returned no text"),
  { source: "chat.ai.empty_response", chat_path: "stream" },
  { mechanism: "manual", severity: "warning", handled: true },
);
```

This posts to `POST /api/log-error` which writes to the `error_reports` table (service-role insert). The `context.source` field is the event name to query by.

**Privacy note:** the telemetry context **never** includes the user message text. Only safe metadata (event name, chat path, upstream error string, route).

---

## How to add a new feature on VexoAPI

1. Add your feature module under `src/features/<feature>/`.
2. For text calls, import `vexoChatModel` from `@/features/ai/lib/vexoProvider`.
3. Wrap the call in a `createServerFn` from `@tanstack/react-start`.
4. Add a budget check if your feature can be expensive (see `aiBudget.server.ts`).
5. Handle empty responses explicitly — never return an empty string silently.
6. Add at least one test for the URL contract (asserting exact `https://vexoapi.site/api/v1/...`).
7. Document the feature in the feature → path map above.

---

## How to debug a "AI returned empty" issue

Diagnostic order:

1. `curl https://vexoapi.site/api/v1/chat/completions` with a real `VEXO_API_KEY` — confirm 200 OK
2. Check `getEnv().VEXO_API_KEY` is set in CF dashboard (not just `.env.local`)
3. Check `getEnv().VEXO_BASE_URL` if you set a custom one
4. Look at the `error_reports` table for `source: chat.ai.empty_response` events
5. Compare the failing feature with a working one — same env, same key, different code path?
6. Re-read `/api/v1` gotcha section above

**Do not** conclude "VexoAPI is dead" from a 404 on `https://vexoapi.site/chat/completions` — that's the parking page, not the API.
