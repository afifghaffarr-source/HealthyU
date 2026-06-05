import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { claimDailyLoginBonus } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";
import { Gift } from "lucide-react";

export const Route = createFileRoute("/_authenticated/login-bonus")({ component: Page });

function Page() {
  const fn = useServerFn(claimDailyLoginBonus);
  const mut = useMutation({
    mutationFn: () => fn({ data: undefined as never }),
    onSuccess: (r) => {
      const b = r.bonus as { coins: number; streak: number };
      toast.success(
        r.alreadyClaimed
          ? `Sudah klaim hari ini (${b.coins} coin, streak ${b.streak})`
          : `+${b.coins} coin! Streak: ${b.streak}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Bonus Harian" showBack />
      <main className="max-w-md mx-auto px-4 pt-8 space-y-6 text-center">
        <div className="size-32 mx-auto rounded-full bg-gradient-to-br from-yellow-400/30 to-orange-500/30 inline-flex items-center justify-center">
          <Gift className="size-16 text-yellow-500" />
        </div>
        <p className="text-muted-foreground">
          Klaim bonus harianmu. Makin lama streak, makin besar reward!
        </p>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-semibold"
        >
          {mut.isPending ? "Mengklaim…" : "Klaim Bonus"}
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
