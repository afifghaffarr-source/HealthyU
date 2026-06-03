import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { gachaPull } from "@/lib/scanBatch7.functions";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/gacha")({ component: Page });

function Page() {
  const fn = useServerFn(gachaPull);
  const [last, setLast] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => fn({ data: undefined as any }),
    onSuccess: (r) => {
      setLast(r.reward.label);
      toast.success(r.reward.label);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Gacha Reward" showBack />
      <main className="max-w-md mx-auto px-4 pt-8 text-center space-y-6">
        <div className="size-40 mx-auto rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-6xl">🎁</div>
        <h2 className="text-2xl font-bold">Putar Gacha</h2>
        <p className="text-sm text-muted-foreground">Biaya 20 coin. Bisa dapat 0–200 coin acak. Jackpot 2%!</p>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="rounded-2xl bg-primary text-primary-foreground px-8 py-3 font-semibold inline-flex items-center gap-2"
        >
          <Gift className="size-5" /> {mut.isPending ? "Memutar..." : "Pull (20 coin)"}
        </button>
        {last && <p className="text-lg font-bold text-primary">Hasil: {last}</p>}
      </main>
      <BottomNav />
    </div>
  );
}