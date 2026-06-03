import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { getGroceryFromPlan } from "@/lib/scanSocial.functions";
import { ShoppingCart, Loader2 } from "lucide-react";
import { z } from "zod";

const SearchSchema = z.object({ planId: z.string().uuid() });

export const Route = createFileRoute("/_authenticated/mealplan/grocery")({
  validateSearch: SearchSchema,
  component: Page,
});

function Page() {
  const { planId } = useSearch({ from: "/_authenticated/mealplan/grocery" });
  const fn = useServerFn(getGroceryFromPlan);
  const { data, isLoading } = useQuery({
    queryKey: ["grocery", planId],
    queryFn: () => fn({ data: { mealPlanId: planId } }),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Grocery List" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingCart className="size-4" /> {data?.list.length ?? 0} item
        </div>
        {isLoading && <Loader2 className="size-4 animate-spin" />}
        {data?.list.map((it) => (
          <label key={it.item} className="flex items-center gap-3 rounded-xl bg-card border p-3">
            <input type="checkbox" className="size-4" />
            <span className="flex-1 text-sm capitalize">{it.item}</span>
            <span className="text-xs text-muted-foreground">x{it.qty.toFixed(1)}</span>
          </label>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}