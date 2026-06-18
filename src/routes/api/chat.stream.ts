import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildChatPayload, persistUserMessage } from "@/features/chat/lib/chatContext.server";
import { classifyMessage, buildCompactProfile } from "@/features/ai/lib/aiRouter.server";
import { cacheKey, getCached, setCached } from "@/features/ai/lib/aiCache.server";
import { enforceAiBudget, logAiUsage } from "@/features/ai/lib/aiBudget.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit.server";
import { chatMessageSchema } from "@/lib/validation";
import { checkChatSafety } from "@/features/chat/lib/chatSafety";
import { moderateImage } from "@/features/moderation/lib/imageModeration.server";
import { streamAiChat, AiGatewayError } from "@/features/ai/lib/aiStreamGateway.server";
import { staticReplyStream, proxyUpstreamStream } from "@/features/chat/lib/chatStream.server";
import { getEnv } from "@/lib/cloudflare-env.server";
import { auditPiiOnServer } from "@/features/chat/lib/piiAudit";
import { redactPII, containsPII } from "@/lib/pii";
import { getPiiRedactEnabled } from "@/features/privacy/lib/piiRedactToggle.functions";

export const Route = createFileRoute("/api/chat/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice(7);
        const env = getEnv();
        const SUPABASE_URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL ?? "";
        const SUPABASE_PUBLISHABLE_KEY =
          env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: cerr } = await supabase.auth.getClaims(token);
        if (cerr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        // Rate limit per user
        const allowed = await checkRateLimit(
          supabase,
          RATE_LIMITS.chat.bucket,
          RATE_LIMITS.chat.max,
          RATE_LIMITS.chat.windowSec,
        );
        if (!allowed) {
          return new Response("Rate limit exceeded. Coba lagi sebentar.", { status: 429 });
        }

        let body: { message: string; imageBase64?: string; imageMime?: string };
        try {
          const raw = await request.json();
          body = chatMessageSchema.parse(raw);
        } catch {
          return new Response("Invalid request payload", { status: 400 });
        }

        // AUDIT-017 Phase 2E: defense-in-depth PII detection on the
        // server. Even if the client bypasses the warning dialog
        // (older app version, direct API call, modified client),
        // the server still records the detection event to audit_log.
        // We do NOT block or redact — the client already gave the
        // user the choice. This is audit-only.
        // auditPiiOnServer is documented to swallow its own errors,
        // but we wrap defensively: a logging failure must never
        // break the chat stream.
        try {
          await auditPiiOnServer(supabase, userId, body.message);
        } catch (e) {
          console.error("chat.stream auditPiiOnServer threw — continuing", (e as Error).message);
        }

        // AUDIT-019: PII redaction toggle. If the user has opted in, run
        // the message through redactPII() before it leaves for the AI.
        // The original is still persisted by `persistUserMessage` below
        // and still feeds the safety classifier — only the AI boundary
        // sees the redacted text. Fail-safe: any error here (DB read,
        // RLS blip) keeps the original message so the chat keeps working.
        let messageForAi = body.message;
        try {
          const piiRedactEnabled = await getPiiRedactEnabled(supabase, userId);
          if (piiRedactEnabled && containsPII(body.message)) {
            messageForAi = redactPII(body.message);
            await supabase.rpc("log_audit_event", {
              _action: "chat.pii.redacted",
              _entity: "chat",
              _meta: { message_length: body.message.length } as never,
            });
          }
        } catch (e) {
          console.error(
            "chat.stream pii redact check failed — continuing with original",
            (e as Error).message,
          );
        }

        // Image moderation: block unsafe uploads before persisting/sending to AI.
        if (body.imageBase64) {
          const mod = await moderateImage(body.imageBase64, body.imageMime ?? "image/jpeg");
          if (mod.blocked) {
            await supabase.rpc("log_audit_event", {
              _action: "chat.image.blocked",
              _entity: "chat",
              _meta: { label: mod.label, confidence: mod.confidence } as never,
            });
            return new Response(
              JSON.stringify({
                error: "image_blocked",
                label: mod.label,
                reason: mod.reason ?? "Unsafe content",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        await persistUserMessage(supabase, userId, body.message, body.imageBase64);

        // Chatbot safety guard — bypass AI for crisis / dangerous content.
        const safety = checkChatSafety(body.message);
        if (safety.kind === "crisis" || safety.kind === "blocked") {
          await supabase.from("chat_messages").insert({
            user_id: userId,
            role: "assistant",
            content: safety.response,
          });
          await supabase.rpc("log_audit_event", {
            _action: safety.kind === "crisis" ? "chat.safety.crisis" : "chat.safety.blocked",
            _entity: "chat",
          });
          await logAiUsage({ userId, feature: "chat", tier: 0 as never, cacheHit: false });
          return staticReplyStream(
            { emergency: safety.kind === "crisis", tier: 0, cached: false, safety: safety.kind },
            safety.response,
          );
        }

        // ED-disclosure analytics (AUDIT-012 Finding 4 follow-up 2026-06-17):
        // log de-identified event so clinical team has data for next quarterly
        // review. NOT PII (no message text), only message length + category.
        // Auto-escalation to crisis is a clinical decision — deferred.
        if (safety.kind === "disclaimer-ed") {
          await supabase.rpc("log_audit_event", {
            _action: "chat.safety.ed_disclosure",
            _entity: "chat",
            _meta: { message_length: body.message.length, category: safety.category },
          });
        }

        const decision = classifyMessage(body.message, !!body.imageBase64);
        const safetyDisclaimer =
          safety.kind === "disclaimer" || safety.kind === "disclaimer-ed" ? safety.response : "";

        // TIER 1 — local rule-based answer, no AI call.
        if (decision.tier === 1 && decision.localAnswer) {
          await supabase.from("chat_messages").insert({
            user_id: userId,
            role: "assistant",
            content: decision.localAnswer,
          });
          await logAiUsage({ userId, feature: "chat", tier: 1, cacheHit: false });
          return staticReplyStream(
            { emergency: false, tier: 1, cached: false },
            decision.localAnswer,
          );
        }

        // Cache lookup (skip for images — they bypass response cache).
        const profile = body.imageBase64
          ? { hash: "img", block: "" }
          : await buildCompactProfile(supabase, userId);
        const key = body.imageBase64
          ? null
          : await cacheKey({
              model: decision.model,
              tier: decision.tier,
              // AUDIT-019: use the redacted version for the cache key so
              // different-redaction-state users don't collide on the same
              // key, and a user with redaction on gets cache hits for
              // their own repeated questions.
              question: messageForAi,
              profileHash: profile.hash,
            });
        const cached = key ? await getCached(key).catch(() => null) : null;
        if (cached) {
          await supabase.from("chat_messages").insert({
            user_id: userId,
            role: "assistant",
            content: cached,
          });
          await logAiUsage({
            userId,
            feature: "chat",
            tier: decision.tier,
            model: decision.model,
            cacheHit: true,
          });
          return staticReplyStream({ emergency: false, tier: decision.tier, cached: true }, cached);
        }

        // Budget gate: only enforced for actual AI calls (tier 2/3 + image).
        const { data: prof } = await supabase
          .from("profiles")
          .select("premium_status")
          .eq("id", userId)
          .maybeSingle();
        const isPremium =
          ((prof?.premium_status as string | null) ?? "free").toLowerCase() === "active";
        let budget: Awaited<ReturnType<typeof enforceAiBudget>>;
        try {
          budget = await enforceAiBudget(userId, isPremium);
        } catch (e) {
          console.error("chat.stream enforceAiBudget failed", (e as Error).message);
          // Fail-open: allow the request with downgrade flag when budget service unavailable.
          budget = { allowed: true, shouldDowngrade: true };
        }
        if (!budget.allowed) {
          return new Response(
            JSON.stringify({
              error: "ai_budget_exceeded",
              reason: budget.reason,
              retryAfterSec: budget.retryAfterSec,
            }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }
        // Auto-downgrade to cheaper model when near limit.
        let effectiveModel = decision.model;
        const downgraded = budget.shouldDowngrade && decision.tier === 3;
        if (downgraded) effectiveModel = "google/gemini-2.5-flash";

        const { messages, isEmergency } = await buildChatPayload(
          supabase,
          userId,
          // AUDIT-019: pass the redacted version when the toggle is on.
          // The user message in the AI's history shows [REDACTED:phone]
          // etc. instead of the actual PII.
          messageForAi,
          body.imageBase64,
          body.imageMime,
          decision.tier,
        );

        let upstreamBody: ReadableStream<Uint8Array>;
        try {
          const r = await streamAiChat({
            model: effectiveModel,
            messages: messages as never,
            maxTokens: decision.maxTokens,
          });
          upstreamBody = r.body;
        } catch (e) {
          if (e instanceof AiGatewayError) {
            return new Response(e.message, { status: e.status });
          }
          return new Response(`AI error: ${(e as Error).message}`, { status: 500 });
        }

        return proxyUpstreamStream(
          upstreamBody,
          { emergency: isEmergency, tier: decision.tier, cached: false },
          {
            onComplete: async (fullText) => {
              await supabase.from("chat_messages").insert({
                user_id: userId,
                role: "assistant",
                content: fullText,
              });
              if (key) {
                try {
                  await setCached({
                    key,
                    response: fullText,
                    model: effectiveModel,
                    tier: decision.tier,
                    isPersonal: decision.tier === 3,
                  });
                } catch (e) {
                  console.error("ai cache write fail", (e as Error).message);
                }
              }
              const promptTokens = Math.ceil(JSON.stringify(messages).length / 4);
              const completionTokens = Math.ceil(fullText.length / 4);
              await logAiUsage({
                userId,
                feature: body.imageBase64 ? "chat_image" : "chat",
                tier: decision.tier,
                model: effectiveModel,
                promptTokens,
                completionTokens,
                cacheHit: false,
                wasDowngraded: downgraded,
              });
            },
          },
          safetyDisclaimer || undefined,
        );
      },
    },
  },
});
