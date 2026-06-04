import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput, uuidSchema } from "@/lib/validation";

const ReportSchema = z.object({
  contentType: z.enum(["post", "comment", "message", "user", "recipe", "photo"]),
  contentId: z.string().min(1).max(255),
  reason: z.enum(["spam", "harassment", "self_harm", "nudity", "misinformation", "medical_advice", "other"]),
  details: z.string().max(1000).optional(),
});

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(ReportSchema, i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc("report_content", {
      _content_type: data.contentType,
      _content_id: data.contentId,
      _reason: data.reason,
      _details: data.details ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { targetId: string }) => parseInput(z.object({ targetId: uuidSchema }), i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc("block_user", { _target: data.targetId });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { targetId: string }) => parseInput(z.object({ targetId: uuidSchema }), i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ok, error } = await supabase.rpc("unblock_user", { _target: data.targetId });
    if (error) throw new Error(error.message);
    return { ok: ok === true };
  });

export const listMyBlocks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("blocked_users")
      .select("id, blocked_id, created_at")
      .eq("blocker_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { blocks: data ?? [] };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("content_reports")
      .select("*")
      .eq("reporter_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { reports: data ?? [] };
  });

// Moderator-only: list pending reports
export const listPendingReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isMod } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isMod && !isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("content_reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { reports: data ?? [] };
  });

const ResolveSchema = z.object({
  reportId: uuidSchema,
  status: z.enum(["reviewed", "actioned", "dismissed"]),
  actionTaken: z.enum(["warn", "hide_content", "mute", "ban"]).optional(),
  reason: z.string().max(500).optional(),
});

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(ResolveSchema, i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isMod } = await supabase.rpc("has_role", { _user_id: userId, _role: "moderator" });
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isMod && !isAdmin) throw new Error("Forbidden");

    const { data: report, error: rErr } = await supabase
      .from("content_reports")
      .update({ status: data.status, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq("id", data.reportId)
      .select()
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!report) throw new Error("Report not found");

    if (data.status === "actioned" && data.actionTaken && report.content_type === "user") {
      await supabase.from("moderation_actions").insert({
        target_user_id: report.content_id,
        moderator_id: userId,
        action: data.actionTaken,
        content_type: report.content_type,
        content_id: report.content_id,
        reason: data.reason ?? `From report ${data.reportId}`,
      });
    }
    await supabase.rpc("log_audit_event", {
      _action: "report.resolved",
      _entity: "content_reports",
      _entity_id: data.reportId,
      _meta: { status: data.status, action: data.actionTaken } as never,
    });
    return { ok: true };
  });