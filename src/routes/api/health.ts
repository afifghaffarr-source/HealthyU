import { createFileRoute } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/app";
import { getEnv } from "@/lib/cloudflare-env.server";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const env = getEnv();
        const envKeys = Object.keys(env);
        const body = {
          ok: true,
          app: APP_CONFIG.name,
          time: new Date().toISOString(),
          version: process.env.npm_package_version ?? "0.0.0",
          env: process.env.NODE_ENV ?? "development",
          // DEBUG: dump env keys (no values) to verify CF bindings reach the handler
          envKeysCount: envKeys.length,
          hasSupabaseUrl: !!env.SUPABASE_URL,
          hasServiceRole: !!env.SUPABASE_SERVICE_ROLE_KEY,
          hasVexoKey: !!env.VEXO_API_KEY,
          envKeysSample: envKeys.slice(0, 20),
        };
        return new Response(JSON.stringify(body, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
