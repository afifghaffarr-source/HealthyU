import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { generateGroceryList } from "@/lib/scanBatch12.functions";

export const Route = createFileRoute("/_authenticated/grocery/smart")({ component: Page });

function Page() {
  const fn = useServerFn(generateGroceryList);
  const [plan, setPlan] = useState("");
  const mut = useMutation({ mutationFn: () => fn({ data: { planText: plan } }) });
  const items =
    (mut.data?.list?.items as Array<{ name: string; qty?: string; unit?: string }> | undefined) ??
    [];
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Daftar Belanja Pintar" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          rows={5}
          placeholder="Tempel meal plan kamu..."
          className="w-full px-3 py-2 rounded-lg border bg-background"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || plan.length < 10}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
        >
          {mut.isPending ? "Membuat..." : "Generate"}
        </button>
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="rounded-lg border bg-card px-3 py-2 text-sm flex justify-between"
            >
              <span>{it.name}</span>
              <span className="text-muted-foreground">
                {it.qty} {it.unit}
              </span>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav />
    </div>
  );
}
