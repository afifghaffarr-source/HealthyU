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
 * Gating (BOTH must hold):
 *   - DEBUG_ENV_TRACE === "1" in env
 *   - NODE_ENV !== "production"   ← BUG FIX: never expose in prod, even if
 *                                  DEBUG_ENV_TRACE is accidentally set.
 *                                  Defense in depth: a leftover/stale
 *                                  DEBUG_ENV_TRACE=1 in CF must NOT leak
 *                                  env metadata to anonymous callers.
 *
 * When any condition fails, returns a generic 404 (no body, no-store)
 * so the endpoint looks identical to a missing route from the outside.
 */
export const Route = createFileRoute("/api/debug/env")({
  server: {
    handlers: {
      GET: async () => {
        const env = getEnv();
        const envObj = (env ?? {}) as Record<string, unknown>;
        const isProduction = envObj.NODE_ENV === "production";
        const debugEnabled = !isProduction && envObj.DEBUG_ENV_TRACE === "1";

        if (!debugEnabled) {
          return new Response(null, {
            status: 404,
            headers: { "Cache-Control": "no-store" },
          });
        }

        const safe = (k: string) => envObj[k];

        // BUG FIX: wrangler 4.100.0 with --var "KEY=VAL" appears to store
        // the literal "KEY=VAL" string as a key (not parse it). The result
        // is envObj with keys like "GIT_SHA=abc123" instead of "GIT_SHA".
        // Normalize: take the part before the first "=" when present, then
        // dedupe (preserving first occurrence order).
        const seen = new Set<string>();
        const normalizedKeys: string[] = [];
        for (const raw of Object.keys(envObj)) {
          const key = raw.includes("=") ? raw.split("=")[0] : raw;
          if (!seen.has(key)) {
            seen.add(key);
            normalizedKeys.push(key);
          }
        }

        const sample = {
          ok: true,
          getEnvType: typeof env,
          getEnvIsNull: env === null,
          getEnvIsUndefined: env === undefined,
          keysCount: normalizedKeys.length,
          keysFirst20: normalizedKeys.slice(0, 20),
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
