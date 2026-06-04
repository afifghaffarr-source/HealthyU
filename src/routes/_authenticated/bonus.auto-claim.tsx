import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { claimDailyLoginBonus } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bonus/auto-claim")({ component: Page });

function Page() {
  const fn = useServerFn(claimDailyLoginBonus);
  const [res, setRes] = useState<string>("Mengklaim...");
  useEffect(() => {
    fn({ data: undefined as never })
      .then((r) => {
        if (r.alreadyClaimed) setRes("Sudah diklaim hari ini");
        else {
          setRes(`+${r.bonus?.coins ?? 0} koin (streak ${r.bonus?.streak ?? 0})`);
          toast.success("Bonus diklaim");
        }
      })
      .catch((e: Error) => setRes(e.message));
  }, [fn]);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Auto Claim Bonus" showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="rounded-2xl border bg-card p-6 text-center text-lg">{res}</div>
      </main>
      <BottomNav />
    </div>
  );
}
