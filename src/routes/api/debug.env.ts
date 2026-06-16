import { createFileRoute } from "@tanstack/react-router";
import { getEnv } from "@/lib/cloudflare-env.server";

/**
 * DEBUG-ONLY endpoint to inspect runtime env bindings.
 *
 * Returns a JSON dump of:
 *   - getEnv() return value (what envInjectionMiddleware injected)
 *   - context keys (what was passed to middleware)
 *   - boolean: did SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY arrive?
 *
 * Gated by DEBUG_ENV_TRACE=1 in wrangler.jsonc vars. When that env is NOT set,
 * returns 404. This is safe to leave in place (no-op unless explicitly enabled).
 */
export const Route = createFileRoute("/api/debug/env")({
  server: {
    handlers: {
      GET: async () => {
        const env = getEnv();
        const envObj = (env ?? {}) as Record<string, unknown>;
        const debugEnabled = envObj.DEBUG_ENV_TRACE === "1";

        if (!debugEnabled) {
          return new Response(JSON.stringify({ error: "DEBUG_ENV_TRACE not enabled" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const safe = (k: string) => envObj[k];
        const sample = {
          ok: true,
          getEnvType: typeof env,
          getEnvIsNull: env === null,
          getEnvIsUndefined: env === undefined,
          keysCount: Object.keys(envObj).length,
          keysFirst20: Object.keys(envObj).slice(0, 20),
          hasSupabaseUrl: !!safe("SUPABASE_URL"),
          hasSupabasePubKey: !!safe("SUPABASE_PUBLISHABLE_KEY"),
          hasVexoApiKey: !!safe("VEXO_API_KEY"),
          hasCronSecret: !!safe("CRON_SECRET"),
          hasVapidPrivate: !!safe("VAPID_PRIVATE_KEY"),
          hasDebugFlag: !!safe("DEBUG_ENV_TRACE"),
          // Don't echo actual secret values
          supabaseUrlStart:
            typeof safe("SUPABASE_URL") === "string"
              ? (safe("SUPABASE_URL") as string).slice(0, 35)
              : null,
          viteSiteUrl: safe("VITE_SITE_URL"),
          gitSha: safe("GIT_SHA"),
          deployedBy: safe("DEPLOYED_BY"),
        };
        return new Response(JSON.stringify(sample, null, 2), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
