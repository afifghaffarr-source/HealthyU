import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Snowflake, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStreakFreezes, claimWeeklyFreeze } from "@/features/wellness/lib/wellness.functions";

const REASON_MSG: Record<string, string> = {
  max_reached: "Sudah maksimal 2 freeze tersimpan.",
  already_claimed: "Sudah diklaim minggu ini.",
  not_eligible: "Catat mood minimal 5 hari minggu ini untuk klaim.",
};

export function StreakFreezeBadge() {
  const qc = useQueryClient();
  const fetchFreezes = useServerFn(getStreakFreezes);
  const claim = useServerFn(claimWeeklyFreeze);

  const { data } = useQuery({
    queryKey: ["streak-freezes"],
    queryFn: () => fetchFreezes(),
    staleTime: 60_000,
  });

  const claimMut = useMutation({
    mutationFn: () => claim(),
    onSuccess: (res) => {
      if (res.ok) {
        toast.success("Streak freeze baru didapat!");
        qc.invalidateQueries({ queryKey: ["streak-freezes"] });
      } else {
        const msg = REASON_MSG[res.reason] ?? "Belum bisa klaim sekarang.";
        toast.info(msg);
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const available = data?.available ?? 0;

  return (
    <section className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/40 p-4 rounded-3xl outline-1 outline-sky-200/60 dark:outline-sky-900/40 shadow-sm animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-2xl bg-sky-500/15 grid place-items-center">
          <Snowflake className="size-6 text-sky-600 dark:text-sky-300" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Streak Freeze</h3>
          <p className="text-xs text-muted-foreground">
            {available > 0
              ? `${available} freeze siap melindungi streak-mu.`
              : "Belum ada freeze. Klaim bonus mingguan."}
          </p>
        </div>
        <div className="text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-300">
          {available}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="mt-3 w-full gap-1.5"
        onClick={() => claimMut.mutate()}
        disabled={claimMut.isPending}
      >
        <Sparkles className="size-4" aria-hidden="true" />
        Klaim bonus mingguan
      </Button>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Catat mood ≥5 hari/minggu untuk dapat 1 freeze (maks. 2).
      </p>
    </section>
  );
}
