import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { ocrNutritionLabel } from "@/features/scan/lib/scanBatch12.functions";

export const Route = createFileRoute("/_authenticated/scan/nutrition-label")({ component: Page });

function Page() {
  const fn = useServerFn(ocrNutritionLabel);
  const [b64, setB64] = useState("");
  const mut = useMutation({ mutationFn: () => fn({ data: { imageBase64: b64 } }) });
  const onFile = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setB64(String(r.result).split(",")[1] ?? "");
    r.readAsDataURL(f);
  };
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="OCR Label Nutrisi" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onFile(e.target.files?.[0])}
          className="w-full text-sm"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={!b64 || mut.isPending}
          className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
        >
          Scan
        </button>
        {mut.data && (
          <pre className="rounded-xl border bg-card p-3 text-xs overflow-auto">
            {JSON.stringify(mut.data.nutrition, null, 2)}
          </pre>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
