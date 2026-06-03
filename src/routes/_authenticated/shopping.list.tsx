import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { smartShoppingList } from "@/lib/scanBatch8.functions";

export const Route = createFileRoute("/_authenticated/shopping/list")({ component: Page });

function Page() {
  const fn = useServerFn(smartShoppingList);
  const [input, setInput] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { ingredients: input.split("\n").filter(Boolean) } }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Smart Shopping List" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder="1 bahan per baris..." className="w-full px-3 py-2 rounded-xl border bg-card text-sm" />
        <button onClick={() => mut.mutate()} disabled={!input || mut.isPending} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5">
          Estimasi Harga
        </button>
        {mut.data && (
          <div className="rounded-2xl bg-card border p-4 space-y-2">
            {mut.data.items.map((it: any, i: number) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{it.item} {it.qty && <span className="text-muted-foreground">({it.qty})</span>}</span>
                <span className="font-medium">Rp {(it.price_idr ?? 0).toLocaleString("id-ID")}</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span>Rp {mut.data.total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}