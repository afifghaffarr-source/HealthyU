import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listRewards, redeemReward } from "@/lib/rewards.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Coins, Gift } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
});

function RewardsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listRewards);
  const redeemFn = useServerFn(redeemReward);
  const { data } = useQuery({ queryKey: ["rewards"], queryFn: () => fetchFn() });

  const redeem = useMutation({
    mutationFn: (reward_id: string) => redeemFn({ data: { reward_id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`Berhasil ditukar! Sisa koin: ${r.remaining_coins}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal"),
  });

  const coins = data?.coins ?? 0;

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="Tukar Koin"
          subtitle="Marketplace reward partner"
          showBack
          action={
            <div className="flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-2 rounded-2xl font-bold">
              <Coins className="size-4" /> <span className="tabular-nums">{coins}</span>
            </div>
          }
        />

        <section className="space-y-3 animate-fade-up">
          {(data?.rewards ?? []).map((r) => {
            const canAfford = coins >= r.coin_cost;
            const outOfStock = r.remaining_stock !== null && r.remaining_stock <= 0;
            return (
              <div key={r.id} className="bg-card p-4 rounded-3xl outline-1 outline-black/5 flex gap-3">
                <div className="size-16 bg-secondary/40 rounded-2xl grid place-items-center overflow-hidden flex-shrink-0">
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.name} className="size-full object-cover" />
                  ) : (
                    <Gift className="size-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-amber-600 font-bold text-sm flex items-center gap-1">
                      <Coins className="size-3.5" /> {r.coin_cost}
                    </span>
                    <button
                      onClick={() => redeem.mutate(r.id)}
                      disabled={!canAfford || outOfStock || redeem.isPending}
                      className="bg-primary text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                    >
                      {outOfStock ? "Habis" : !canAfford ? "Kurang" : "Tukar"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {(data?.rewards.length ?? 0) === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada reward.</p>
          )}
        </section>

        {(data?.redemptions.length ?? 0) > 0 && (
          <section className="space-y-2 animate-fade-up">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Riwayat Penukaran</h2>
            {data!.redemptions.map((r) => (
              <div key={r.id} className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(r.redeemed_at).toLocaleDateString("id-ID")}
                </span>
                <span className="font-semibold capitalize">{r.delivery_status}</span>
                <span className="text-amber-600 font-bold tabular-nums">-{r.coins_spent}</span>
              </div>
            ))}
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}