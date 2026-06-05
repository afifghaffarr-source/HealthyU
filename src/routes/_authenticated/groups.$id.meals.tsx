import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { groupMealFeed } from "@/features/scan/lib/scanMore.functions";
import { Utensils } from "lucide-react";

export const Route = createFileRoute("/_authenticated/groups/$id/meals")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: ["group-meals", params.id],
        queryFn: () => groupMealFeed({ data: { group_id: params.id } }),
      }),
    ),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Page() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(
    queryOptions({
      queryKey: ["group-meals", params.id],
      queryFn: () => groupMealFeed({ data: { group_id: params.id } }),
    }),
  );
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Meal Grup Hari Ini" showBack />
      <main className="max-w-md mx-auto px-4 pt-2 space-y-2">
        {data.meals.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <Utensils className="mx-auto h-10 w-10 opacity-40 mb-2" />
            Belum ada meal hari ini
          </div>
        )}
        {data.meals.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border">
            {m.user_avatar ? (
              <img loading="lazy" decoding="async" src={m.user_avatar} className="size-10 rounded-full" alt="" />
            ) : (
              <div className="size-10 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">
                {m.user_name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.user_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {m.meal_type} · {m.custom_name ?? "meal"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-primary">
                {Math.round(Number(m.calories ?? 0))}
              </p>
              <p className="text-[10px] text-muted-foreground">kkal</p>
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
