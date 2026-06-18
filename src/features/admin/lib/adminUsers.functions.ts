/**
 * Admin users management server function.
 * Lists users with search, grants admin role.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { parseInput } from "@/lib/validation";

const ListInputSchema = z.object({
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(25),
});

const GrantRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "moderator", "user"]),
});

const RevokeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "moderator", "user"]),
});

export type UserListItem = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  roles: string[];
};

export type UserListResult = {
  items: UserListItem[];
  total: number;
  page: number;
  perPage: number;
};

async function ensureAdmin(supabase: typeof supabaseAdmin, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

async function getUserRolesMap(userIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (userIds.length === 0) return map;
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);
  for (const row of data ?? []) {
    if (!map.has(row.user_id)) map.set(row.user_id, []);
    map.get(row.user_id)!.push(row.role);
  }
  return map;
}

export const listUsersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(ListInputSchema, i))
  .handler(async ({ data, context }): Promise<UserListResult> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    const res = await supabaseAdmin.auth.admin.listUsers({
      page: data.page,
      perPage: data.perPage,
    });

    let items = res.data?.users ?? [];
    if (data.search && data.search.trim()) {
      const s = data.search.trim().toLowerCase();
      items = items.filter((u) => (u.email ?? "").toLowerCase().includes(s));
    }

    const rolesMap = await getUserRolesMap(items.map((u) => u.id));
    const finalItems: UserListItem[] = items.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      banned_until: u.banned_until ?? null,
      roles: rolesMap.get(u.id) ?? [],
    }));

    return {
      items: finalItems,
      total: data.perPage * 999 + finalItems.length, // best-effort: Supabase paginated list doesn't return exact total
      page: data.page,
      perPage: data.perPage,
    };
  });

export const grantRoleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(GrantRoleSchema, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, userId);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error && !error.message.includes("duplicate")) {
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const revokeRoleAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(RevokeRoleSchema, i))
  .handler(async ({ data, context }) => {
    const { userId: actingUserId } = context as { userId: string };
    await ensureAdmin(supabaseAdmin, actingUserId);

    // Prevent self-revoke of admin
    if (actingUserId === data.userId && data.role === "admin") {
      throw new Error("Tidak bisa revoke admin role dari diri sendiri");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
