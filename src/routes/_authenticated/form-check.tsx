import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { analyzeFormCheck } from "@/lib/scanBatch12.functions";

export const Route = createFileRoute("/_authenticated/form-check")({ component: Page });

function Page() {
  const fn = useServerFn(analyzeFormCheck);
  const [ex, setEx] = useState("Squat");
  const [desc, setDesc] = useState("");
  const mut = useMutation({ mutationFn: () => fn({ data: { exercise: ex, description: desc } }) });
  const f = mut.data?.feedback;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="AI Form Check" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <input value={ex} onChange={(e) => setEx(e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-background" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="Deskripsikan gerakanmu..." className="w-full px-3 py-2 rounded-lg border bg-background" />
        <button onClick={() => mut.mutate()} disabled={mut.isPending || desc.length < 5} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm">Analisa</button>
        {f && (
          <div className="rounded-xl border bg-card p-3 space-y-2 text-sm">
            <p>Skor: <span className="font-bold">{f.score}/10</span></p>
            {f.mistakes && <div><p className="font-semibold">Kesalahan:</p><ul className="list-disc pl-4">{f.mistakes.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
            {f.tips && <div><p className="font-semibold">Tips:</p><ul className="list-disc pl-4">{f.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></div>}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}