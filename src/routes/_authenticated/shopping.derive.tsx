import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/shopping/derive")({
  component: ShoppingDerivePage,
});

const sample = [
  { item: "Ayam dada", qty: "1.5 kg", price: 75000 },
  { item: "Beras merah", qty: "2 kg", price: 30000 },
  { item: "Sayur bayam", qty: "5 ikat", price: 15000 },
  { item: "Telur", qty: "1 kg", price: 28000 },
  { item: "Tahu tempe", qty: "10 pcs", price: 20000 },
];

function ShoppingDerivePage() {
  const total = sample.reduce((s, x) => s + x.price, 0);
  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title="Belanja dari Meal Plan" subtitle="Auto-derive mingguan" showBack />
      <ul className="mt-4 space-y-2">
        {sample.map((s) => (
          <li key={s.item} className="flex justify-between rounded-2xl bg-card p-4 border border-border/40">
            <div>
              <p className="font-semibold">{s.item}</p>
              <p className="text-xs text-muted-foreground">{s.qty}</p>
            </div>
            <span className="font-mono text-primary">Rp {s.price.toLocaleString("id-ID")}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-2xl bg-primary/10 p-4 flex justify-between border border-primary/20">
        <span className="font-bold">Total Estimasi</span>
        <span className="font-bold text-primary">Rp {total.toLocaleString("id-ID")}</span>
      </div>
      <BottomNav />
    </div>
  );
}