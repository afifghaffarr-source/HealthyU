import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { scanBarcode } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scan/barcode-live")({ component: Page });

function Page() {
  const fn = useServerFn(scanBarcode);
  const [code, setCode] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { barcode: code } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const p = mut.data?.product as any;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Barcode Scanner" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Masukkan barcode (8-13 digit)" className="w-full px-3 py-2 rounded-xl border bg-card" />
        <button onClick={() => mut.mutate()} disabled={code.length < 6 || mut.isPending} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium">
          {mut.isPending ? "Mencari…" : "Cari Produk"}
        </button>
        {p && (
          <div className="rounded-2xl bg-card border p-4 space-y-2 text-sm">
            <div className="font-semibold text-base">{p.product_name ?? "Tanpa nama"}</div>
            {p.brand && <div className="text-muted-foreground">{p.brand}</div>}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div>Kalori: {p.calories_per_100g ?? "-"} kcal/100g</div>
              <div>Protein: {p.protein_g ?? "-"} g</div>
              <div>Karbo: {p.carbs_g ?? "-"} g</div>
              <div>Lemak: {p.fat_g ?? "-"} g</div>
            </div>
            {p.allergens?.length > 0 && (
              <div className="pt-2 text-red-500 text-xs">⚠️ Alergen: {p.allergens.join(", ")}</div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}