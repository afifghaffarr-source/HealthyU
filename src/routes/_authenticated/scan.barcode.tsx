import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { lookupBarcode, relogMeal } from "@/features/scan/lib/scanExtras.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan/barcode")({
  component: Page,
});

type Product = Awaited<ReturnType<typeof lookupBarcode>>;

function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<Product | null>(null);
  const [grams, setGrams] = useState(100);
  const lookup = useServerFn(lookupBarcode);
  const relog = useServerFn(relogMeal);

  const lookMut = useMutation({
    mutationFn: (barcode: string) => lookup({ data: { barcode } }),
    onSuccess: (r) => {
      if (!r.found) toast.error("Produk tidak ditemukan di Open Food Facts");
      setProduct(r);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logMut = useMutation({
    mutationFn: () => {
      if (!product || !product.found) throw new Error("no product");
      const f = grams / 100;
      return relog({
        data: {
          name: product.name,
          calories: Math.round(product.per100g.calories * f),
          protein_g: product.per100g.protein * f,
          carbs_g: product.per100g.carbs * f,
          fat_g: product.per100g.fat * f,
          meal_type: "snack",
          portion_g: grams,
        },
      });
    },
    onSuccess: () => toast.success("Dicatat"),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    // PERF (Fase 5 sub-PR 3): lazy-load @zxing/browser (≈150K minified) only
    // when the user actually opens the scan page AND grants camera permission.
    // Saves the entire zxing bundle from the route's initial chunk (scan.barcode
    // 437K → ~280K route + ~150K zxing on demand).
    let reader: import("@zxing/browser").BrowserMultiFormatReader | null = null;
    let stopped = false;
    let controls: { stop: () => void } | null = null;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
          if (stopped || !result) return;
          const text = result.getText();
          if (/^[0-9]{6,20}$/.test(text)) {
            stopped = true;
            setCode(text);
            controls?.stop();
            lookMut.mutate(text);
          }
        });
      } catch (e) {
        toast.error("Tidak bisa akses kamera");
      }
    })();
    return () => {
      stopped = true;
      controls?.stop();
      reader = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Scan Barcode" showBack />
      <div className="p-4 space-y-3">
        <div className="rounded-2xl overflow-hidden bg-black aspect-square">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        </div>
        {lookMut.isPending && (
          <div className="text-center text-sm text-muted-foreground">
            <Loader2 className="size-4 inline animate-spin" /> Mencari produk…
          </div>
        )}
        {code && <div className="text-xs text-muted-foreground text-center">Kode: {code}</div>}
        {product?.found && (
          <div className="rounded-2xl bg-card border p-4 space-y-3">
            <div className="flex gap-3">
              {product.image && (
                <img
                  loading="lazy"
                  decoding="async"
                  src={product.image}
                  alt=""
                  className="size-16 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{product.name}</div>
                <div className="text-xs text-muted-foreground truncate">{product.brand}</div>
                <div className="text-xs mt-1">
                  {Math.round(product.per100g.calories)} kkal / 100g
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Porsi (gram)</label>
              <input
                type="number"
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-muted/60 outline-none"
              />
            </div>
            <button
              onClick={() => logMut.mutate()}
              disabled={logMut.isPending}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
            >
              Catat {Math.round((product.per100g.calories * grams) / 100)} kkal
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
