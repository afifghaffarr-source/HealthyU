import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { importRecipeFromUrl } from "@/lib/scanBatch12.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recipes/import")({ component: Page });

function Page() {
  const fn = useServerFn(importRecipeFromUrl);
  const [url, setUrl] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { url } }),
    onSuccess: () => toast.success("Resep diimport"),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Import Resep dari URL" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border bg-background" />
        <button onClick={() => mut.mutate()} disabled={!url || mut.isPending} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm">
          {mut.isPending ? "Mengambil..." : "Import"}
        </button>
        {mut.data?.parsed && (
          <div className="rounded-xl border bg-card p-3">
            <h3 className="font-semibold">{mut.data.parsed.title}</h3>
            <p className="text-xs mt-2">Bahan: {mut.data.parsed.ingredients?.length ?? 0}</p>
            <p className="text-xs">Langkah: {mut.data.parsed.steps?.length ?? 0}</p>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}