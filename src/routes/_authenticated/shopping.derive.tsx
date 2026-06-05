import { createFileRoute, Link } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useMemo, useState } from "react";
import { Check, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/shopping/derive")({
  component: ShoppingDerivePage,
});

type Item = {
  id: string;
  item: string;
  qty: string;
  price: number;
  category: "Protein" | "Karbo" | "Sayur" | "Lainnya";
};
const SAMPLE: Item[] = [
  { id: "1", item: "Ayam dada", qty: "1.5 kg", price: 75000, category: "Protein" },
  { id: "2", item: "Telur", qty: "1 kg", price: 28000, category: "Protein" },
  { id: "3", item: "Tahu tempe", qty: "10 pcs", price: 20000, category: "Protein" },
  { id: "4", item: "Beras merah", qty: "2 kg", price: 30000, category: "Karbo" },
  { id: "5", item: "Ubi", qty: "1 kg", price: 12000, category: "Karbo" },
  { id: "6", item: "Bayam", qty: "5 ikat", price: 15000, category: "Sayur" },
  { id: "7", item: "Brokoli", qty: "500 g", price: 18000, category: "Sayur" },
  { id: "8", item: "Buah pisang", qty: "1 sisir", price: 25000, category: "Lainnya" },
];

function ShoppingDerivePage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    SAMPLE.forEach((i) => {
      (g[i.category] ??= []).push(i);
    });
    return g;
  }, []);
  const remaining = SAMPLE.filter((i) => !checked[i.id]);
  const total = remaining.reduce((s, x) => s + x.price, 0);
  const doneCount = SAMPLE.length - remaining.length;
  return (
    <div className="min-h-dvh pb-32 px-4 bg-background">
      <TopAppBar title="Belanja dari Meal Plan" subtitle="Auto-derive mingguan" showBack />
      <div className="mt-4 rounded-3xl bg-gradient-to-br from-primary to-accent text-primary-foreground p-4">
        <p className="text-xs uppercase tracking-wider opacity-80 inline-flex items-center gap-1">
          <Sparkles className="size-3" /> Diturunkan dari meal plan 7 hari
        </p>
        <p
          className="text-2xl font-bold mt-1 tabular-nums"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Rp {total.toLocaleString("id-ID")}
        </p>
        <p className="text-xs opacity-90 mt-0.5">
          {doneCount}/{SAMPLE.length} item sudah dicentang
        </p>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat} className="mt-5">
          <h3 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 px-1">
            {cat}
          </h3>
          <ul className="space-y-2">
            {items.map((s) => {
              const done = !!checked[s.id];
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setChecked((c) => ({ ...c, [s.id]: !c[s.id] }))}
                    className={`w-full flex justify-between items-center rounded-2xl p-3.5 border text-left transition ${
                      done ? "bg-muted/60 border-border/40 opacity-60" : "bg-card border-border/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`size-6 rounded-full grid place-items-center border-2 transition ${
                          done
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {done && <Check className="size-3.5" />}
                      </span>
                      <div>
                        <p className={`font-semibold text-sm ${done ? "line-through" : ""}`}>
                          {s.item}
                        </p>
                        <p className="text-xs text-muted-foreground">{s.qty}</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm text-primary tabular-nums">
                      Rp {s.price.toLocaleString("id-ID")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <div className="mt-6 flex gap-2">
        <Link
          to="/shopping/list"
          className="flex-1 rounded-2xl bg-card border py-3 text-center text-sm font-semibold"
        >
          <ShoppingBag className="size-4 inline mr-1" /> Manual
        </Link>
        <button
          onClick={() => toast.success("Daftar belanja diunduh")}
          className="flex-1 rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold"
        >
          Simpan / Bagikan
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
