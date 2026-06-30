/**
 * Admin Notification Templates — server fns for /admin/notifications.
 *
 * public.notification_templates — DB-driven email + push notification
 * templates. Replaces hardcoded subject/title in
 * requestDigest.functions.ts and push.server.ts so admins can edit
 * template copy without a code deploy.
 *
 * Pattern: POST + parseInput + ensureAdmin, mirrors adminConfig.functions.ts.
 *
 * NOTE: notification_templates is NOT in generated Supabase types (added
 * in Sprint 58-B migration). Re-generate types via
 * `bunx supabase gen types typescript` and remove this cast.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseInput } from "@/lib/validation";

const ADMIN_GUARD = requireSupabaseAuth;
// Cast needed because `notification_templates` is not yet in generated
// Supabase types (added in Sprint 58-B migration).
const db = supabaseAdmin as any; // eslint-disable-line no-restricted-syntax, @typescript-eslint/no-explicit-any

const ChannelSchema = z.enum(["email", "push"]);
const LocaleSchema = z.enum(["id", "en"]);
const KeySchema = z.string().min(1).max(80);

async function ensureAdmin(userId: string) {
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  } as never);
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

// ── Types ───────────────────────────────────────────────────────────

export type NotificationTemplate = {
  id: number;
  channel: "email" | "push";
  template_key: string;
  locale: "id" | "en";
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  variables: string[];
  is_active: boolean;
  updated_by: string | null;
  updated_at: string;
};

export type NotificationChannel = z.infer<typeof ChannelSchema>;
export type NotificationLocale = z.infer<typeof LocaleSchema>;

// ── Schemas ─────────────────────────────────────────────────────────

const ListInput = z
  .object({
    channel: ChannelSchema.optional(),
    locale: LocaleSchema.optional(),
  })
  .optional()
  .default({});

const UpsertInput = z.object({
  channel: ChannelSchema,
  template_key: KeySchema,
  locale: LocaleSchema,
  subject: z.string().max(200).nullable().optional(),
  body_text: z.string().max(20_000).nullable().optional(),
  body_html: z.string().max(50_000).nullable().optional(),
  variables: z.array(z.string().min(1).max(40)).max(40).optional(),
  is_active: z.boolean().optional(),
});

const DeleteInput = z.object({
  id: z.number().int().positive(),
});

const ToggleInput = z.object({
  id: z.number().int().positive(),
  is_active: z.boolean(),
});

const ServerFetchInput = z.object({
  channel: ChannelSchema,
  template_key: KeySchema,
  locale: LocaleSchema.default("id"),
});

const PreviewInput = z.object({
  template: z.string().min(1).max(20_000),
  variables: z.record(z.string(), z.string()),
});

// ── List (admin) ────────────────────────────────────────────────────

export const listNotificationTemplates = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(ListInput, i))
  .handler(async ({ data, context }): Promise<NotificationTemplate[]> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    let q = db
      .from("notification_templates")
      .select(
        "id, channel, template_key, locale, subject, body_text, body_html, variables, is_active, updated_by, updated_at",
      )
      .order("channel", { ascending: true })
      .order("template_key", { ascending: true })
      .order("locale", { ascending: true });
    if (data.channel) q = q.eq("channel", data.channel);
    if (data.locale) q = q.eq("locale", data.locale);
    const { data: rows, error } = await q;
    if (error) throw new Error(`listNotificationTemplates: ${error.message}`);
    return (rows ?? []) as NotificationTemplate[];
  });

// ── Upsert (admin) ──────────────────────────────────────────────────

export const upsertNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(UpsertInput, i))
  .handler(async ({ data, context }): Promise<NotificationTemplate> => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);

    const payload: Record<string, unknown> = {
      channel: data.channel,
      template_key: data.template_key,
      locale: data.locale,
      subject: data.subject ?? null,
      body_text: data.body_text ?? null,
      body_html: data.body_html ?? null,
      variables: data.variables ?? [],
      is_active: data.is_active ?? true,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { data: row, error } = await db
      .from("notification_templates")
      .upsert(payload, { onConflict: "channel,template_key,locale" })
      .select(
        "id, channel, template_key, locale, subject, body_text, body_html, variables, is_active, updated_by, updated_at",
      )
      .single();
    if (error) throw new Error(`upsertNotificationTemplate: ${error.message}`);

    await db.from("audit_log").insert({
      user_id: userId,
      action: "notif_template.upsert",
      meta: {
        channel: data.channel,
        template_key: data.template_key,
        locale: data.locale,
      },
    });

    return row as NotificationTemplate;
  });

// ── Delete (admin) ──────────────────────────────────────────────────

export const deleteNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(DeleteInput, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { error } = await db.from("notification_templates").delete().eq("id", data.id);
    if (error) throw new Error(`deleteNotificationTemplate: ${error.message}`);

    await db.from("audit_log").insert({
      user_id: userId,
      action: "notif_template.delete",
      meta: { id: data.id },
    });
    return { deleted: true } as const;
  });

// ── Toggle is_active (admin) ────────────────────────────────────────

export const toggleNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(ToggleInput, i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await ensureAdmin(userId);
    const { data: row, error } = await db
      .from("notification_templates")
      .update({
        is_active: data.is_active,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", data.id)
      .select("id, is_active")
      .single();
    if (error) throw new Error(`toggleNotificationTemplate: ${error.message}`);
    await db.from("audit_log").insert({
      user_id: userId,
      action: data.is_active ? "notif_template.enable" : "notif_template.disable",
      meta: { id: data.id },
    });
    return row as { id: number; is_active: boolean };
  });

// ── Server-side fetch (no admin required, used by senders) ──────────

/**
 * Reads a template with automatic locale fallback to 'id' if requested
 * locale missing. Returns null when no template exists in any locale.
 */
export const getNotificationTemplate = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => parseInput(ServerFetchInput, i))
  .handler(
    async ({
      data,
    }): Promise<{
      subject: string | null;
      body_text: string | null;
      body_html: string | null;
    } | null> => {
      // Try requested locale first
      const { data: row, error } = await db
        .from("notification_templates")
        .select("subject, body_text, body_html")
        .eq("channel", data.channel)
        .eq("template_key", data.template_key)
        .eq("locale", data.locale)
        .eq("is_active", true)
        .maybeSingle();
      if (!error && row)
        return row as {
          subject: string | null;
          body_text: string | null;
          body_html: string | null;
        };
      // Fallback to 'id' if requested locale missing
      if (data.locale !== "id") {
        const { data: fallback, error: fbErr } = await db
          .from("notification_templates")
          .select("subject, body_text, body_html")
          .eq("channel", data.channel)
          .eq("template_key", data.template_key)
          .eq("locale", "id")
          .eq("is_active", true)
          .maybeSingle();
        if (!fbErr && fallback)
          return fallback as {
            subject: string | null;
            body_text: string | null;
            body_html: string | null;
          };
      }
      return null;
    },
  );

// ── Variable interpolation helper (shared, runs on server) ──────────

/**
 * Renders a template string with {variable} placeholders. Unknown
 * placeholders are left intact so they can be debugged. Used by
 * preview endpoint and by callers to render outbound notifications.
 */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

export const previewNotificationTemplate = createServerFn({ method: "POST" })
  .middleware([ADMIN_GUARD])
  .inputValidator((i: unknown) => parseInput(PreviewInput, i))
  .handler(async ({ data }) => {
    return { rendered: interpolate(data.template, data.variables) };
  });
