import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/onboarding/ai")({ component: Page });

const Q = [
  "Apa target utama kesehatanmu?",
  "Berapa lama biasanya kamu tidur?",
  "Olahraga favoritmu apa?",
  "Ada alergi/restriksi makanan?",
  "Berapa gelas air per hari biasanya?",
];

function Page() {
  const [step, setStep] = useState(0);
  const [ans, setAns] = useState<string[]>([]);
  const [val, setVal] = useState("");
  const done = step >= Q.length;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="AI Interview" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {!done ? (
          <>
            <p className="text-xs text-muted-foreground">Pertanyaan {step + 1}/{Q.length}</p>
            <p className="font-semibold">{Q[step]}</p>
            <textarea value={val} onChange={(e) => setVal(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border bg-background" />
            <button onClick={() => { setAns([...ans, val]); setVal(""); setStep(step + 1); }} disabled={!val} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm">Lanjut</button>
          </>
        ) : (
          <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
            <p className="font-semibold">Selesai! Profil kamu:</p>
            {Q.map((q, i) => <div key={i}><p className="text-xs text-muted-foreground">{q}</p><p>{ans[i]}</p></div>)}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}