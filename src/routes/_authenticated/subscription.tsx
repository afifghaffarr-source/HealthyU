import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getSubscription, upgradeSubscription } from "@/lib/scanBatch12.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/subscription")({ component: Page });

const TIERS = [
  { id: "free", name: "Free", price: "Rp 0", perks: ["Fitur dasar"] },
  { id: "pro", name: "Pro", price: "Rp 49.000/bln", perks: ["AI unlimited", "Meal plan otomatis", "Tanpa iklan"] },
  { id: "ultimate", name: "Ultimate", price: "Rp 99.000/bln", perks: ["Semua Pro", "Konsultasi dokter", "Family up to 5"] },
] as const;

function Page() {
  const qc = useQueryClient();
  const getFn = useServerFn(getSubscription);
  const upFn = useServerFn(upgradeSubscription);
  const { data } = useQuery({ queryKey: ["sub"], queryFn: () => getFn({ data: undefined as never }) });
  const mut = useMutation({
    mutationFn: (tier: "free" | "pro" | "ultimate") => upFn({ data: { tier } }),
    onSuccess: () => { toast.success("Berhasil upgrade"); qc.invalidateQueries({ queryKey: ["sub"] }); },
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Subscription" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <p className="text-sm">Saat ini: <span className="font-semibold">{data?.sub.tier}</span></p>
        {TIERS.map((t) => (
          <div key={t.id} className="rounded-2xl border bg-card p-4">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold">{t.name}</h3>
              <span className="text-sm">{t.price}</span>
            </div>
            <ul className="text-xs text-muted-foreground mb-3 list-disc pl-4">{t.perks.map((p) => <li key={p}>{p}</li>)}</ul>
            <button onClick={() => mut.mutate(t.id)} disabled={data?.sub.tier === t.id || mut.isPending} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm">
              {data?.sub.tier === t.id ? "Aktif" : "Pilih"}
            </button>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}