import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AppRole = "admin" | "moderator" | "user";

/** Get the current user's roles. Returns [] if none assigned. */
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (error) {
      console.error("[roles] fetch error:", error.message);
      return { roles: [] as AppRole[] };
    }
    return { roles: (data ?? []).map((r) => r.role as AppRole) };
  });

/** Check if the current user has a specific role (uses has_role RPC). */
export const checkMyRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: AppRole }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: data.role,
    });
    if (error) {
      console.error("[roles] has_role error:", error.message);
      return { hasRole: false };
    }
    return { hasRole: ok === true };
  });
