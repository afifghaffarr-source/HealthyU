// Self-managed Supabase admin client (no longer Lovable-generated).
// Server-side only, uses service role key (bypasses RLS).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getEnv } from "@/lib/cloudflare-env.server";

function createSupabaseAdminClient() {
  // Read from CF env (AsyncLocalStorage) first, then process.env fallback.
  // process.env works in local dev (.env) + tests (vi.stubEnv), and the CF
  // env has the real secrets in production.
  const env = getEnv();
  const SUPABASE_URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in Cloudflare Workers → Settings → Variables/Secrets (production) or .env (local dev).`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(String(SUPABASE_URL), String(SUPABASE_SERVICE_ROLE_KEY), {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Import like: import { supabaseAdmin } from "@/integrations/supabase/client.server";
//
// Note: the Proxy lazy-initializes on first property access, so importing
// this module doesn't trigger env validation. The first actual call site
// (e.g. `supabaseAdmin.from("...")`) inside a request handler will read
// the CF env via AsyncLocalStorage.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
