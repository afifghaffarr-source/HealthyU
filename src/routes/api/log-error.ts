import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ErrorPayloadSchema = z.object({
  source: z.string().min(1).max(64),
  boundary: z.string().min(1).max(64),
  message: z.string().min(1).max(2000),
  stack: z.string().max(20000).nullable().optional(),
  context: z.record(z.unknown()).default({}),
  route: z.string().max(500).nullable().optional(),
  handled: z.boolean().default(false),
  severity: z.enum(["error", "warning", "info"]).default("error"),
  mechanism: z
    .enum(["manual", "onerror", "unhandledrejection", "react_error_boundary"])
    .default("react_error_boundary"),
});

/**
 * POST /api/log-error
 *
 * Receives error reports from the client-side errorReporting.ts and writes
 * them to public.error_reports via the service role. The user_id is best-
 * effort: we read the bearer token if present and attach it, but anonymous
 * (unauthenticated) reports are allowed.
 */
export const Route = createFileRoute("/api/log-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Best-effort user attribution. Failures here must not block the report.
        let userId: string | null = null;
        try {
          const auth = request.headers.get("authorization");
          if (auth?.startsWith("Bearer ")) {
            const token = auth.slice(7);
            const SUPABASE_URL = process.env.SUPABASE_URL;
            const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
            if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
              const supabase = createClient<Database>(
                SUPABASE_URL,
                SUPABASE_PUBLISHABLE_KEY,
                {
                  auth: { persistSession: false, autoRefreshToken: false },
                },
              );
              const { data } = await supabase.auth.getClaims(token);
              userId = data?.claims?.sub ?? null;
            }
          }
        } catch {
          userId = null;
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const parsed = ErrorPayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid payload", details: parsed.error.issues },
            { status: 400 },
          );
        }

        const row = parsed.data;
        const { error } = await supabaseAdmin.from("error_reports").insert({
          user_id: userId,
          source: row.source,
          boundary: row.boundary,
          message: row.message.slice(0, 2000),
          stack: row.stack?.slice(0, 20000) ?? null,
          context: row.context as never, // Zod Record<string, unknown> → Supabase Json cast
          route: row.route ?? null,
          handled: row.handled,
          severity: row.severity,
        });

        if (error) {
          console.error("[log-error] insert failed:", error.message);
          return Response.json({ ok: false }, { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});
