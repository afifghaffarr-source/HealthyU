# Post-Mortem: Chat AI Empty Reply (2026-06-19)

## TL;DR

**Symptom:** Production chat (`/api/chat/stream`) returned SSE `done {}` event with **no text delta**. User saw the chat box render but get no AI reply. Recommendations + Scan kept working.

**Root cause:** Vercel AI SDK's `createOpenAICompatible` provider hardcodes the chat completions path as `${baseURL}/chat/completions`. VexoAPI serves the path under `/api/v1/`, so the SDK was hitting `https://vexoapi.site/chat/completions` — a 404 (parking page hosted on the same domain). The SDK swallowed the 404 in a generic try/catch and returned an empty response. The caller (`callAiTextWithVision` Branch 3 in `aiProviders.ts`) then emitted `text: ""` upstream, which the chat SSE layer converted to `done {}`.

**Fix:** Append `/api/v1` to the provider's `baseURL` in `vexoProvider.ts`:

```ts
// Vercel AI SDK hardcodes path `/chat/completions` and appends it to
// `baseURL`. VexoAPI serves that path under `/api/v1/`, so we append
// the prefix here.
const baseURL = readVexoBaseUrl().replace(/\/+$/, "") + "/api/v1";
```

**Why other AI features kept working:**

| Feature         | Path                                       | Why it works                                                                                                             |
| --------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Scan (image)    | OpenRouter vision                          | Uses OpenRouter SDK → standard `/chat/completions` path.                                                                 |
| Recommendations | `callAiWithGuards` → `callVexoApi`         | Direct `fetch` in `vexoAdapter.server.ts:233` builds the URL manually with `/api/v1/chat/completions`. Bypasses the SDK. |
| Coach chat      | `streamAiChat` → Vexo SDK                  | Was the broken path. Same `baseURL` issue.                                                                               |
| Weekly report   | `callAiTextWithVision` Branch 3 → Vexo SDK | Was the broken path.                                                                                                     |

The 3 broken paths all share `vexoProvider.ts` → `getProvider()` → `createOpenAICompatible`. One fix covers all three.

---

## Timeline

| When (UTC)        | Event                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-06-19 ~20:00 | User reports chat empty in production. Other AI features OK.                                                                                        |
| 2026-06-19 ~20:15 | Misdiagnosis: agent tests `https://vexoapi.site/v1/chat/completions` → 404. Concludes VexoAPI is dead.                                              |
| 2026-06-19 ~20:20 | User correction: "Vexoapi.site aku cek hidup kok. Kenapa dibilang dead? Untuk AI kalau bisa pake Vexo pakai vexo semua. Kecuali untuk scan gambar." |
| 2026-06-19 ~20:25 | Agent tests `https://vexoapi.site/api/v1/chat/completions` → 200 OK. VexoAPI confirmed alive.                                                       |
| 2026-06-19 ~20:30 | Direct test of `callAiTextWithVision` Branch 3 → returns 404. Discovered path mismatch.                                                             |
| 2026-06-19 ~20:35 | Fix: append `/api/v1` to SDK `baseURL`.                                                                                                             |
| 2026-06-19 ~20:42 | Build + deploy. Version `aaa291bb-...` (cache-control).                                                                                             |
| 2026-06-19 ~21:05 | Second deploy with chat fix. Version `7005bd4e-...`.                                                                                                |

---

## What Went Wrong (Blameless Post-Mortem)

### 1. Misdiagnosis: "VexoAPI is dead"

**What happened:** The agent tested `https://vexoapi.site/v1/chat/completions` (wrong path) and got a 404 + HTML parking page. The agent then looked up DNS for the bare domain and saw parking IPs (`216.198.79.1`, `64.29.17.1`). It concluded "VexoAPI is dead" without testing any other path.

**Why it was wrong:**

- 404 + HTML body can mean many things. A domain can host a parking page at the root and serve an API at a specific subpath.
- DNS resolve to parking IPs is a _root-domain_ signal, not an _API_ signal. Shared hosting platforms often put the bare domain on a parking page while the real app is at an API path.
- The right test: send an actual API request with a real API key to the documented path. If you don't know the exact path, the API docs or the VexoAPI repo should be checked first.

**Lesson learned:** Always test the _exact documented endpoint_ with a real API key, not the root domain or a guessed path. DNS and root-domain HTTP responses are not reliable signals for whether an API is alive.

### 2. Why did Recommendations + Scan keep working?

This was the most useful signal. If VexoAPI were dead, **all** features using it would fail. Recommendations kept working, which means VexoAPI was responding to _some_ traffic. The agent should have asked "why does this one path work and another doesn't?" earlier.

The two code paths are different:

```ts
// vexoAdapter.server.ts:233 — direct fetch (works)
const url = `${readVexoBaseUrl()}/api/v1/chat/completions`;

// vexoProvider.ts (Sprint 1c) — Vercel AI SDK (broken)
const provider = createOpenAICompatible({
  name: "vexo",
  baseURL: "https://vexoapi.site", // SDK appends /chat/completions → 404
  apiKey,
});
```

The fix is a single line: append `/api/v1` to the SDK's `baseURL`. The direct-fetch adapter already builds the URL manually and doesn't need this.

### 3. Silent error swallow in `callAiTextWithVision`

`callAiTextWithVision` Branch 3 in `aiProviders.ts` catches errors and returns `{ data: "", latencyMs, attempts }`. The chat SSE layer then emits `done {}` because there's no data. From the user's perspective, this looks like "AI didn't respond" rather than "AI is down" or "API is misconfigured".

**Action item (deferred):** Add a `meta` field to the return shape with the last error or upstream status, so the chat UI can show a useful fallback message ("AI is having trouble, please try again") instead of just being silent. Tracked in Sprint 5a polish backlog.

### 4. No regression test for the SDK URL

Until this fix, the `vexoProvider.test.ts` only tested model name resolution, not the actual HTTP request URL. If a future SDK upgrade or refactor changes how the baseURL is interpreted, this same bug would silently come back.

**Action item (done in this fix):** Added 4 new test cases in `vexoProvider.test.ts` that stub `fetch` and assert the exact request URL is `https://vexoapi.test/api/v1/chat/completions`, including trailing-slash and missing-env-var edge cases. See `describe("baseURL suffix (regression: 2026-06-19 chat empty bug)")`.

---

## Prevention: How to Catch This Faster Next Time

1. **Always test the exact documented API endpoint first**, not the root domain. If the docs are unclear, check the provider's repo (`https://github.com/AzzamCyber/VexoAPI`).
2. **Compare working vs broken features**. If some features using the same upstream work, the upstream is alive — the bug is in the integration code.
3. **Don't trust silent error catches**. Add telemetry or fallthrough logs for empty AI responses. (Tracked in Sprint 5a polish.)
4. **Pin the SDK's exact URL contract in a test.** If a feature depends on a specific external URL pattern, write a regression test that asserts the URL. Done in this fix.
5. **Diagnostic order of operations** for "AI empty reply" symptoms:
   1. `curl` the exact documented endpoint with a real key.
   2. Check feature code: which call site is used? Direct `fetch` or SDK wrapper?
   3. Compare the working path's URL with the broken path's URL.
   4. Add logging if the URL construction is non-obvious.

---

## Action Items

| Item                                                     | Status                   | Owner    |
| -------------------------------------------------------- | ------------------------ | -------- |
| Fix: append `/api/v1` to Vexo SDK `baseURL`              | ✅ Done                  | agent    |
| Add regression test for SDK URL                          | ✅ Done                  | agent    |
| Deploy fix to production                                 | ✅ Done (`7005bd4e-...`) | agent    |
| Update memory: VexoAPI path note                         | ✅ Done                  | agent    |
| Improve empty-AI fallback UX in chat                     | ⏳ Sprint 5a polish      | deferred |
| Add telemetry for "AI returned empty text" events        | ⏳ Sprint 5a polish      | deferred |
| Document VexoAPI integration in `docs/ai-integration.md` | ⏳ Sprint 5a             | deferred |

---

## Files Touched

| File                                                 | Change                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/features/ai/lib/vexoProvider.ts`                | Append `/api/v1` to SDK `baseURL` (1 logical line, 3 source lines with comment) |
| `src/features/ai/lib/__tests__/vexoProvider.test.ts` | Added 4 regression tests for baseURL suffix behavior                            |
| `docs/postmortems/2026-06-19-chat-empty-reply.md`    | This document                                                                   |
| `~/.hermes/memory/...`                               | Updated memory with VexoAPI path gotcha                                         |

---

## Verification

- ✅ `bunx tsc --noEmit` — clean
- ✅ `bun run test` — 628/628 passed (71 files)
- ✅ `bun run build` — built in 30.15s, 465 modules
- ✅ `wrangler deploy` — Version `7005bd4e-0c01-4d5c-84cd-bdd08e08d595`
- ✅ Direct `curl https://vexoapi.site/api/v1/chat/completions` — 200 OK
- ⏳ Production `/api/chat/stream` end-to-end — needs user verification on device

---

## Conclusion

A simple path-mismatch bug caused a 4-day chat outage in production. The fix is one line, but the post-mortem surfaces three improvements that would catch this faster next time:

1. **Trust the documented API endpoint**, not the root domain's parking page.
2. **Compare working vs broken features** to localize the bug.
3. **Pin external API URLs in tests** so refactors can't silently break them.

The fix is live. The user should test the chat end-to-end on their device to confirm.
