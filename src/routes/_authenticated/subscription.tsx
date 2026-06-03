import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { listPlans, subscribe, cancelSubscription } from "@/lib/subscription.functions";

export const Route = createFileRoute("/_authenticated/subscription")({
  component: SubscriptionPage,
});

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function SubscriptionPage() {
  const qc = useQueryClient();
  const fetchPlans = useServerFn(listPlans);
  const subFn = useServerFn(subscribe);
  const cancelFn = useServerFn(cancelSubscription);

  const { data, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => fetchPlans() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["plans"] });

  const subM = useMutation({
    mutationFn: (p: { plan_id: string; billing_period: "monthly" | "yearly" | "lifetime" }) => subFn({ data: p }),
    onSuccess: () => { toast.success("Berlangganan aktif!"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelM = useMutation({
    mutationFn: () => cancelFn(),
    onSuccess: () => { toast.success("Berlangganan dibatalkan"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const plans = data?.plans ?? [];
  const current = data?.current;

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/dashboard" className="size-9 inline-flex items-center justify-center rounded-full bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Crown className="size-4 text-primary" />
            Langganan
          </h1>
        </div>
      </header>
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground text-center py-10">Memuat…</p>}
        {current && (
          <div className="rounded-3xl bg-primary/10 outline-1 outline-primary/30 p-4">
            <p className="text-xs text-muted-foreground">Paket aktif</p>
            <p className="font-bold">{current.plan?.name ?? "—"}</p>
            {current.expires_at && (
              <p className="text-xs text-muted-foreground mt-1">Berakhir: {new Date(current.expires_at).toLocaleDateString("id-ID")}</p>
            )}
            <button onClick={() => cancelM.mutate()} disabled={cancelM.isPending} className="mt-3 h-9 px-4 rounded-2xl bg-background text-sm font-semibold">
              Batalkan
            </button>
          </div>
        )}
        {plans.map((p) => {
          const features = Array.isArray(p.features) ? (p.features as unknown[]) : [];
          const isCurrent = current?.plan_id === p.id;
          return (
            <article key={p.id} className="rounded-3xl bg-card outline-1 outline-black/5 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-bold">{p.name}</h2>
                  {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold">{p.price_idr === 0 ? "Gratis" : formatIDR(p.price_idr)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{p.billing_period}</p>
                </div>
              </div>
              {features.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {features.slice(0, 6).map((f, i) => (
                    <li key={i} className="text-xs flex items-start gap-2">
                      <Check className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{String(f)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                disabled={isCurrent || subM.isPending || p.price_idr === 0}
                onClick={() => subM.mutate({
                  plan_id: p.id,
                  billing_period: (p.billing_period === "yearly" || p.billing_period === "lifetime") ? p.billing_period : "monthly",
                })}
                className="mt-4 w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
              >
                {isCurrent ? "Paket Aktif" : p.price_idr === 0 ? "Paket Default" : "Pilih"}
              </button>
            </article>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}