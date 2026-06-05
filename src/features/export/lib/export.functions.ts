import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { USER_DATA_TABLES } from "@/lib/userDataTables";

export const exportAllData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const tables: Record<string, unknown[]> = {};

    for (const { table, ownerColumn, optional } of USER_DATA_TABLES) {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .eq(ownerColumn, userId);
      if (error) {
        if (optional) {
          tables[table] = [];
          continue;
        }
        // Don't leak raw DB error text. Log server-side; throw a generic message.
        console.error(`[export.allData] ${table}:`, error);
        throw new Error("Gagal mengekspor data. Silakan coba lagi.");
      }
      tables[table] = data ?? [];
    }

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      json: JSON.stringify(tables),
    };
  });
