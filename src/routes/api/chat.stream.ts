import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildChatPayload, persistUserMessage } from "@/lib/chat.functions";
import { classifyMessage, buildCompactProfile } from "@/lib/aiRouter.server";
import { cacheKey, getCached, setCached } from "@/lib/aiCache.server";
import { enforceAiBudget, logAiUsage } from "@/lib/aiBudget.server";

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
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("AI not configured", { status: 500 });

        const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: cerr } = await supabase.auth.getClaims(token);
        if (cerr || !claims?.claims?.sub) {
          return new Response("Unauthorized", { status: 401 });
        }
        const userId = claims.claims.sub;

        let body: { message: string; imageBase64?: string; imageMime?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        if (!body.message || body.message.length > 2000) {
          return new Response("Invalid message", { status: 400 });
        }

        await persistUserMessage(supabase, userId, body.message, body.imageBase64);
        const decision = classifyMessage(body.message, !!body.imageBase64);
        const encoder = new TextEncoder();

        // TIER 1 — local rule-based answer, no AI call.
        if (decision.tier === 1 && decision.localAnswer) {
          await supabase.from("chat_messages").insert({
            user_id: userId, role: "assistant", content: decision.localAnswer,
          });
          const local = decision.localAnswer;
          await logAiUsage({ userId, feature: "chat", tier: 1, cacheHit: false });
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ emergency: false, tier: 1, cached: false })}\n\n`));
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
            user_id: userId, role: "assistant", content: cached,
          });
          await logAiUsage({ userId, feature: "chat", tier: decision.tier, model: decision.model, cacheHit: true });
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ emergency: false, tier: decision.tier, cached: true })}\n\n`));
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
        const isPremium = ((prof?.premium_status as string | null) ?? "free").toLowerCase() === "active";
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
          supabase, userId, body.message, body.imageBase64, body.imageMime, decision.tier,
        );

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: effectiveModel,
            messages,
            stream: true,
            ...(decision.maxTokens ? { max_tokens: decision.maxTokens } : {}),
          }),
        });

        if (upstream.status === 429) return new Response("Rate limited", { status: 429 });
        if (upstream.status === 402) return new Response("Credits exhausted", { status: 402 });
        if (!upstream.ok || !upstream.body) {
          return new Response(`AI error ${upstream.status}`, { status: 500 });
        }

        const decoder = new TextDecoder();
        let fullText = "";
        let buffer = "";

        const stream = new ReadableStream({
          async start(controller) {
            // Prefix with emergency flag header (line-prefixed JSON meta)
            controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify({ emergency: isEmergency, tier: decision.tier, cached: false })}\n\n`));
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
                  } catch { /* ignore parse errors */ }
                }
              }
              if (fullText) {
                await supabase.from("chat_messages").insert({
                  user_id: userId, role: "assistant", content: fullText,
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
              controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`));
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