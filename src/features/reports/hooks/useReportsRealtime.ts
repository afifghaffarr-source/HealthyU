import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";

export function useLastSeenReportId() {
  return useQuery({
    queryKey: ["profile-last-seen-report"],
    queryFn: async (): Promise<string | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("last_seen_report_id")
        .eq("id", uid)
        .maybeSingle();
      return (prof as { last_seen_report_id?: string | null } | null)?.last_seen_report_id ?? null;
    },
  });
}

export function useMarkReportSeen(
  focus: string | undefined,
  latestId: string | null,
  lastSeenId: string | null,
) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!latestId || lastSeenId === latestId) return;
    if (focus !== "latest") return;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      await supabase
        .from("profiles")
        .update({ last_seen_report_id: latestId } as never)
        .eq("id", uid);
      qc.invalidateQueries({ queryKey: ["profile-last-seen-report"] });
    })();
  }, [focus, latestId, lastSeenId, qc]);
}

export function useAiReportsRealtime() {
  const qc = useQueryClient();
  const manualGenAtRef = useRef<number>(0);
  useEffect(() => {
    const ch = supabase
      .channel("ai-reports-archive")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_reports" }, () => {
        qc.setQueryData(["profile-last-seen-report"], null);
        qc.invalidateQueries({ queryKey: ["ai-reports"] });
        if (Date.now() - manualGenAtRef.current > 10000) {
          toast.success("📄 Laporan minggu baru tersedia");
        }
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [qc]);
  return manualGenAtRef;
}
