import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildChatPayload, persistUserMessage } from "@/lib/chat.functions";
import { classifyMessage, buildCompactProfile } from "@/lib/aiRouter.server";
import { cacheKey, getCached, setCached } from "@/lib/aiCache.server";
import { enforceAiBudget, logAiUsage } from "@/lib/aiBudget.server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit.server";
import { chatMessageSchema } from "@/lib/validation";
import { checkChatSafety } from "@/lib/chatSafety";
import { moderateImage } from "@/lib/imageModeration.server";
import { streamAiChat, parseSseChunk, AiGatewayError } from "@/lib/aiStreamGateway.server";

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
        const encoder = new TextEncoder();
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
          const reply = safety.response;
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `event: meta\ndata: ${JSON.stringify({ emergency: safety.kind === "crisis", tier: 0, cached: false, safety: safety.kind })}\n\n`,
                ),
              );
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: reply })}\n\n`));
              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
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
          const local = decision.localAnswer;
          await logAiUsage({ userId, feature: "chat", tier: 1, cacheHit: false });
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `event: meta\ndata: ${JSON.stringify({ emergency: false, tier: 1, cached: false })}\n\n`,
                ),
              );
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: local })}\n\n`));
              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
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
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  `event: meta\ndata: ${JSON.stringify({ emergency: false, tier: decision.tier, cached: true })}\n\n`,
                ),
              );
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: cached })}\n\n`));
              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              "X-Accel-Buffering": "no",
            },
          });
        }

        // Budget gate: only enforced for actual AI calls (tier 2/3 + image).
        const { data: prof } = await supabase
          .from("profiles")
          .select("premium_status")
          .eq("id", userId)
          .maybeSingle();
        const isPremium =
          ((prof?.premium_status as string | null) ?? "free").toLowerCase() === "active";
        const budget = await enforceAiBudget(userId, isPremium);
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
            messages,
            maxTokens: decision.maxTokens,
          });
          upstreamBody = r.body;
        } catch (e) {
          if (e instanceof AiGatewayError) {
            return new Response(e.message, { status: e.status });
          }
          return new Response(`AI error: ${(e as Error).message}`, { status: 500 });
        }

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        const stream = new ReadableStream({
          async start(controller) {
            // Prefix with emergency flag header (line-prefixed JSON meta)
            controller.enqueue(
              encoder.encode(
                `event: meta\ndata: ${JSON.stringify({ emergency: isEmergency, tier: decision.tier, cached: false })}\n\n`,
              ),
            );
            const reader = upstream.body!.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const raw of lines) {
                  const line = raw.trim();
                  if (!line.startsWith("data:")) continue;
                  const payload = line.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const json = JSON.parse(payload);
                    const delta: string | undefined = json?.choices?.[0]?.delta?.content;
                    if (delta) {
                      fullText += delta;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
                    }
                  } catch {
                    /* ignore parse errors */
                  }
                }
              }
              if (fullText) {
                if (safetyDisclaimer) {
                  fullText += safetyDisclaimer;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta: safetyDisclaimer })}\n\n`),
                  );
                }
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
                // Rough token estimate when upstream doesn't return usage.
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
              }
              controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
            } catch (err) {
              controller.enqueue(
                encoder.encode(
                  `event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`,
                ),
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
