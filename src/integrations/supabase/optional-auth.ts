import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getEnv } from "@/lib/cloudflare-env.server";

/**
 * Optional auth — returns the current user if a valid Bearer token is present,
 * or `null` if no token / invalid token. Use this for endpoints that want to
 * personalize content (bookmark state, ratings) for authed users while still
 * serving anon users gracefully.
 *
 * Compare with `requireSupabaseAuth` which throws on missing/invalid auth.
 */
export const getOptionalUser = createServerFn({ method: "GET" }).handler(async () => {
  const env = getEnv();
  const SUPABASE_URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    env.SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    // No env configured → behave as anon
    return { userId: null, email: null } as const;
  }

  const request = getRequest();
  const authHeader = request?.headers?.get("authorization") ?? null;
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, email: null } as const;
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token) return { userId: null, email: null } as const;

  try {
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return { userId: null, email: null } as const;
    }
    return {
      userId: data.claims.sub,
      email: (data.claims as { email?: string }).email ?? null,
    } as const;
  } catch {
    return { userId: null, email: null } as const;
  }
});
