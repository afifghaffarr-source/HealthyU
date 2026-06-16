import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getThemePref, upsertThemePref } from "@/features/scan/lib/scanBatch10.functions";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/theme")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const getFn = useServerFn(getThemePref);
  const setFn = useServerFn(upsertThemePref);
  const { data } = useQuery({
    queryKey: ["theme-pref"],
    queryFn: () => getFn({ data: undefined as never }),
  });
  const mode = (data?.pref as { mode?: "auto" | "light" | "dark" } | undefined)?.mode ?? "auto";
  const mut = useMutation({
    mutationFn: (m: "auto" | "light" | "dark") => setFn({ data: { mode: m } }),
    onSuccess: () => {
      toast.success("Tersimpan");
      qc.invalidateQueries({ queryKey: ["theme-pref"] });
    },
  });
  useEffect(() => {
    if (mode === "auto") {
      const h = new Date().getHours();
      document.documentElement.classList.toggle("dark", h < 6 || h >= 18);
    } else {
      document.documentElement.classList.toggle("dark", mode === "dark");
    }
  }, [mode]);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Tema" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {(["auto", "light", "dark"] as const).map((m) => (
          <button
            key={m}
            onClick={() => mut.mutate(m)}
            className={`w-full rounded-xl p-4 text-left border ${mode === m ? "bg-primary text-primary-foreground" : "bg-card"}`}
          >
            <div className="font-medium capitalize">{m === "auto" ? "Auto (matahari)" : m}</div>
            <div className="text-xs opacity-70">
              {m === "auto"
                ? "Gelap saat malam, terang saat siang"
                : m === "light"
                  ? "Selalu terang"
                  : "Selalu gelap"}
            </div>
          </button>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
