import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { scanBarcode } from "@/lib/scanBatch9.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scan/barcode-camera")({ component: Page });

function Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [code, setCode] = useState<string>("");
  const fn = useServerFn(scanBarcode);
  const mut = useMutation({ mutationFn: (barcode: string) => fn({ data: { barcode } }) });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    const Detector = (
      window as unknown as {
        BarcodeDetector?: new (o: { formats: string[] }) => {
          detect: (s: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) {
      toast.error("BarcodeDetector tidak didukung browser ini");
      return;
    }
    const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "code_128"] });
    (async () => {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const tick = async () => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const res = await detector.detect(videoRef.current);
            if (res[0]) {
              setCode(res[0].rawValue);
              mut.mutate(res[0].rawValue);
              return;
            }
          } catch {
            /* noop */
          }
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })().catch((e) => toast.error(String(e)));
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Scan Barcode (Kamera)" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <video ref={videoRef} className="w-full rounded-xl border" muted playsInline />
        {code && (
          <p className="text-sm">
            Barcode: <span className="font-mono">{code}</span>
          </p>
        )}
        {mut.data?.product && (
          <pre className="rounded-xl border bg-card p-3 text-xs overflow-auto">
            {JSON.stringify(mut.data.product, null, 2)}
          </pre>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
