import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { parseMenuImage } from "@/features/scan/lib/scanExtras.functions";
import { ComboDetectionChip } from "@/features/scan/components/ComboDetectionChip";
import { PostScanAdjuster } from "@/features/scan/components/PostScanAdjuster";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { validateImageFile, fileToDataUrl } from "@/lib/image-utils";

export const Route = createFileRoute("/_authenticated/scan/menu")({ component: Page });

function Page() {
  const ref = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [showCombo, setShowCombo] = useState(true);
  const parse = useServerFn(parseMenuImage);
  const m = useMutation({
    mutationFn: (url: string) => parse({ data: { image_data_url: url } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleRescan = () => {
    setImg(null);
    setShowCombo(true);
    m.reset();
    ref.current?.click();
  };

  const handleSave = async (adjustedItems: Array<{ adjusted_calories: number }>) => {
    // TODO Sprint W4: Save to meal_logs with combo support
    // For now, just show success toast
    toast.success(
      `${adjustedItems.length} item disimpan (${adjustedItems.reduce((sum, i) => sum + i.adjusted_calories, 0)} kkal)`,
    );

    // Reset for next scan
    setTimeout(() => {
      setImg(null);
      setShowCombo(true);
      m.reset();
    }, 1500);
  };

  const hasCombo = m.data?.combo && showCombo;
  const hasItems = m.data?.items && m.data.items.length > 0;

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Scan Menu Restoran" showBack />
      <div className="p-4 space-y-3">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              validateImageFile(f);
            } catch (err) {
              toast.error((err as Error).message);
              return;
            }
            const url = await fileToDataUrl(f);
            setImg(url);
            setShowCombo(true);
            m.mutate(url);
          }}
        />
        {!img ? (
          <button
            onClick={() => ref.current?.click()}
            className="w-full py-12 rounded-2xl bg-card border border-dashed flex flex-col items-center gap-2 text-sm text-muted-foreground"
          >
            <Camera className="size-8" /> Foto menu restoran
          </button>
        ) : (
          <img
            loading="lazy"
            decoding="async"
            src={img}
            className="w-full rounded-2xl"
            alt="menu"
          />
        )}
        {m.isPending && (
          <div className="text-center text-sm">
            <Loader2 className="inline size-4 animate-spin" /> Membaca menu…
          </div>
        )}

        {/* Empty state: No food detected */}
        {m.isSuccess && (!m.data?.items || m.data.items.length === 0) && (
          <div className="rounded-2xl bg-card border p-6 text-center space-y-2">
            <div className="text-4xl">🤔</div>
            <div className="font-medium">Tidak ada makanan terdeteksi</div>
            <div className="text-sm text-muted-foreground">
              Coba foto yang lebih jelas atau pastikan ada makanan di frame
            </div>
            <button
              onClick={handleRescan}
              className="mt-3 px-4 py-2 rounded-xl border font-medium hover:bg-accent transition-colors"
            >
              Scan Ulang
            </button>
          </div>
        )}

        {/* Sprint W3: Combo detection chip */}
        {hasCombo && m.data?.combo && (
          <ComboDetectionChip
            comboName={m.data.combo.name}
            totalCalories={m.data.combo.totalCalories}
            onDismiss={() => setShowCombo(false)}
          />
        )}

        {/* Sprint W3: Post-scan adjuster with sliders */}
        {hasItems && m.data?.items && (
          <PostScanAdjuster items={m.data.items} onSave={handleSave} onRescan={handleRescan} />
        )}
      </div>
      <BottomNav />
    </div>
  );
}
