import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildChatPayload, persistUserMessage } from "@/features/chat/lib/chat.functions";
import { classifyMessage, buildCompactProfile } from "@/features/ai/lib/aiRouter.server";
import { cacheKey, getCached, setCached } from "@/features/ai/lib/aiCache.server";
import { enforceAiBudget, logAiUsage } from "@/features/ai/lib/aiBudget.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit.server";
import { chatMessageSchema } from "@/lib/validation";
import { checkChatSafety } from "@/features/chat/lib/chatSafety";
import { moderateImage } from "@/features/moderation/lib/imageModeration.server";
import { streamAiChat, AiGatewayError } from "@/features/ai/lib/aiStreamGateway.server";
import { staticReplyStream, proxyUpstreamStream } from "@/features/chat/lib/chatStream.server";

export const Route = createFileRoute("/api/chat/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        if (!auth?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = auth.slice(7);
        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

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

        const decision = classifyMessage(body.message, !!body.imageBase64);
        const safetyDisclaimer = safety.kind === "disclaimer" ? safety.response : "";

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
              question: body.message,
              profileHash: profile.hash,
            });
        const cached = key ? await getCached(key) : null;
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
          return staticReplyStream(
            { emergency: false, tier: decision.tier, cached: true },
            cached,
          );
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
          // Fail-closed: chat (esp. with images) is expensive.
          return new Response(
            JSON.stringify({ error: "ai_budget_unavailable" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
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
          body.message,
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
