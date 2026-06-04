import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseInput, shortTextSchema, uuidSchema } from "@/lib/validation";

const SaveSchema = z.object({
  title: shortTextSchema,
  note: z.string().min(1).max(20000),
  category: z.string().max(80).optional(),
});
const UpdateSchema = SaveSchema.extend({ id: uuidSchema });

export const listSensitiveNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("list_sensitive_notes");
    if (error) throw new Error(error.message);
    return { notes: data ?? [] };
  });

export const getSensitiveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => parseInput(z.object({ id: uuidSchema }), i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc("get_sensitive_note", { _id: data.id });
    if (error) throw new Error(error.message);
    return { note: rows?.[0] ?? null };
  });

export const saveSensitiveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(SaveSchema, i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: id, error } = await supabase.rpc("save_sensitive_note", {
      _title: data.title,
      _note: data.note,
      _category: data.category ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { id: id as string };
  });

export const updateSensitiveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => parseInput(UpdateSchema, i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ok, error } = await supabase.rpc("update_sensitive_note", {
      _id: data.id,
      _title: data.title,
      _note: data.note,
      _category: data.category ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: ok === true };
  });

export const deleteSensitiveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => parseInput(z.object({ id: uuidSchema }), i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("sensitive_health_notes")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_audit_event", {
      _action: "sensitive_note.delete",
      _entity: "sensitive_health_notes",
      _entity_id: data.id,
    });
    return { ok: true };
  });