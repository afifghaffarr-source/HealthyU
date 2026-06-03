import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createFamilyPlan, listMyFamily } from "@/lib/scanFinal.functions";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/family")({
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMyFamily);
  const createFn = useServerFn(createFamilyPlan);
  const [name, setName] = useState("");
  const { data } = useQuery({
    queryKey: ["family-plans"],
    queryFn: () => listFn({ data: undefined as any }),
  });
  const mut = useMutation({
    mutationFn: () => createFn({ data: { name: name || undefined } }),
    onSuccess: () => {
      setName("");
      toast.success("Family plan dibuat");
      qc.invalidateQueries({ queryKey: ["family-plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Family Plan" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <h3 className="font-semibold inline-flex items-center gap-2">
            <Users className="size-4" /> Buat Plan Keluarga
          </h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama plan (cth: Keluarga Setiawan)"
            className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2 text-sm font-medium inline-flex items-center justify-center gap-1"
          >
            <Plus className="size-4" /> Buat
          </button>
        </div>
        {data?.plans.map((m: any) => (
          <div key={m.plan_id} className="rounded-2xl bg-card border p-3">
            <div className="font-medium">{m.family_plans?.name}</div>
            <div className="text-xs text-muted-foreground">
              {m.family_plans?.owner_id === undefined ? "" : "Plan aktif"}
            </div>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}