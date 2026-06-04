import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { scanBarcode } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";
import { Camera, CameraOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/scan/barcode-live")({ component: Page });

type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

function Page() {
  const fn = useServerFn(scanBarcode);
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const mut = useMutation({
    mutationFn: () => fn({ data: { barcode: code } }),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  };

  useEffect(() => () => stop(), []);

  const start = async () => {
    try {
      const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
      if (!Ctor) {
        toast.error("Browser tidak mendukung BarcodeDetector");
        return;
      }
      const detector = new Ctor({ formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e"] });
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      const loop = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const results = await detector.detect(videoRef.current);
          if (results[0]?.rawValue) {
            const v = results[0].rawValue.replace(/\D/g, "");
            if (v.length >= 6) {
              setCode(v);
              toast.success(`Terdeteksi: ${v}`);
              mut.mutate();
              stop();
              return;
            }
          }
        } catch {/* skip frame */}
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      toast.error((e as Error).message);
      stop();
    }
  };

  const p = mut.data?.product as any;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Barcode Scanner" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl overflow-hidden bg-black aspect-[4/3] relative">
          <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
          {!scanning && (
            <div className="absolute inset-0 grid place-items-center text-white/70 text-sm">
              Tap "Mulai Scan" untuk aktifkan kamera
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-1/3 border-2 border-primary rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
            </div>
          )}
        </div>
        <button
          onClick={scanning ? stop : start}
          disabled={supported === false}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {scanning ? <><CameraOff className="size-4" /> Stop Scan</> : <><Camera className="size-4" /> Mulai Scan</>}
        </button>
        {supported === false && (
          <p className="text-xs text-amber-600 text-center">Browser tidak mendukung BarcodeDetector. Gunakan input manual.</p>
        )}
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="Atau ketik barcode manual" className="w-full px-3 py-2 rounded-xl border bg-card" />
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