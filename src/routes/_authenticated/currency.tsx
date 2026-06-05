import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { convertCurrency } from "@/features/scan/lib/scanBatch8.functions";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/currency")({ component: Page });

function Page() {
  const fn = useServerFn(convertCurrency);
  const [amount, setAmount] = useState("10000");
  const [from, setFrom] = useState("IDR");
  const [to, setTo] = useState("USD");
  const mut = useMutation({
    mutationFn: () => fn({ data: { amount: Number(amount), from, to } }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Konversi Mata Uang" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border bg-background text-lg"
          />
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background"
            >
              {["IDR", "USD", "EUR", "JPY", "SGD", "MYR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <ArrowRight className="size-4 text-muted-foreground" />
            <select
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg border bg-background"
            >
              {["USD", "IDR", "EUR", "JPY", "SGD", "MYR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            Konversi
          </button>
          {mut.data && (
            <div className="text-center pt-2">
              <div className="text-2xl font-bold">
                {mut.data.converted.toFixed(2)} {to}
              </div>
              <div className="text-xs text-muted-foreground">
                Rate: 1 {from} = {mut.data.rate} {to}
              </div>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
