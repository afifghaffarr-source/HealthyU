import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listHabitStacks, createHabitStack } from "@/features/scan/lib/scanBatch7.functions";
import { Plus, Link as LinkIcon } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/habits/stack")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listHabitStacks);
  const createFn = useServerFn(createHabitStack);
  const [name, setName] = useState("");
  const [steps, setSteps] = useState("");
  const { data } = useQuery({
    queryKey: ["habit-stacks"],
    queryFn: () => listFn({ data: undefined as never }),
  });
  const mut = useMutation({
    mutationFn: () => createFn({ data: { name, steps: steps.split("\n").filter(Boolean) } }),
    onSuccess: () => {
      toast.success("Stack dibuat");
      setName("");
      setSteps("");
      qc.invalidateQueries({ queryKey: ["habit-stacks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Habit Stack" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <h3 className="font-semibold text-sm">Buat Stack Baru</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama (mis. Pagi Sehat)"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="Langkah (1 per baris)"
            rows={4}
            className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
          />
          <button
            onClick={() => mut.mutate()}
            disabled={!name || mut.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm inline-flex items-center justify-center gap-2"
          >
            <Plus className="size-4" /> Simpan
          </button>
        </div>
        {(data?.stacks ?? []).map((s) => (
          <div key={s.id} className="rounded-2xl bg-card border p-4">
            <div className="flex items-center gap-2 mb-2">
              <LinkIcon className="size-4 text-primary" />
              <h4 className="font-semibold">{s.name}</h4>
            </div>
            <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
              {(s.steps as string[]).map((st, i) => (
                <li key={i}>{st}</li>
              ))}
            </ol>
          </div>
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
