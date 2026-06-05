import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Camera, Loader2, Sparkles, X, History, Zap } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { recognizeFood } from "@/features/food/lib/foodScan.functions";
import { checkScanLimit } from "@/features/scan/lib/scanMore.functions";
import { ScanItemsList } from "@/features/scan/components/ScanItemsList";
import { SafetyChip } from "@/components/healthyu/safety-chip";
import {
  MEAL_TYPES,
  pickDefaultMealType,
  fileToDataUrl,
} from "@/features/scan/lib/scanHelpers";
import { MealTypePicker } from "@/features/scan/components/MealTypePicker";
import {
  useScanRecognizeMutation,
  useScanLogMutation,
} from "@/features/scan/hooks/useScanMutations";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

type Item = Awaited<ReturnType<typeof recognizeFood>>["items"][number];

function ScanPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const limitFn = useServerFn(checkScanLimit);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [originals, setOriginals] = useState<Item[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [usePro, setUsePro] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["v"]>(pickDefaultMealType());

  const scanMut = useScanRecognizeMutation({
    usePro,
    imageUrl,
    setItems,
    setOriginals,
    setScanId,
  });
  const logMut = useScanLogMutation({
    originals,
    scanId,
    mealType,
    editIdx,
    setItems,
    setOriginals,
    setEditIdx,
  });

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function handleFile(file: File) {
    try {
      const lim = await limitFn().catch(() => null);
      if (lim && lim.remaining <= 0 && !lim.isPro) {
        toast.error(`Limit harian ${lim.limit} scan. Upgrade Pro untuk unlimited.`);
        return;
      }
      const url = await fileToDataUrl(file);
      setImageUrl(url);
      setItems([]);
      scanMut.mutate(url);
    } catch {
      toast.error("Gagal memproses gambar");
    }
  }

  function reset() {
    setImageUrl(null);
    setItems([]);
    setOriginals([]);
    setScanId(null);
    setEditIdx(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="min-h-dvh bg-background pb-28">
      <main className="max-w-md mx-auto px-4 pt-2 space-y-4">
        <TopAppBar
          title="Scan Makanan"
          showBack
          action={
            <Link
              to="/scan/history"
              className="inline-flex items-center gap-1 text-xs text-primary"
              aria-label="Riwayat scan"
            >
              <History className="size-4" />
            </Link>
          }
        />
        <SafetyChip variant="ai-estimate" className="w-full justify-center" />
        <div className="flex items-center justify-between rounded-2xl bg-card border px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="size-3.5 text-primary" />
            <span>
              Mode AI: <b>{usePro ? "Akurat (lebih lambat)" : "Cepat"}</b>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUsePro((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium inline-flex items-center gap-1 min-h-9"
            aria-label={usePro ? "Beralih ke mode cepat" : "Beralih ke mode akurat"}
          >
            <Zap className="size-3" /> {usePro ? "Pakai Cepat" : "Pakai Akurat"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground -mt-2 px-1">
          {usePro
            ? "Akurat: sedikit lebih lama, tapi lebih teliti."
            : "Cepat: cocok untuk catatan harian."}
        </p>
        {!imageUrl && (
          <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-xl p-2">
            💡 Tip: sertakan referensi (sendok, garpu, atau tangan) di foto agar estimasi porsi
            lebih akurat.
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {!imageUrl ? (
          <div className="bg-card rounded-3xl p-8 text-center border border-dashed border-border space-y-4">
            <div className="size-16 mx-auto rounded-2xl bg-primary/10 grid place-items-center">
              <Camera className="size-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Foto makananmu</p>
              <p className="text-xs text-muted-foreground mt-1">
                AI memperkirakan nama, porsi, & kalori — kamu bisa ubah sebelum simpan
              </p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
            >
              Ambil / Pilih Foto
            </button>
          </div>
        ) : (
          <>
            <div className="relative rounded-3xl overflow-hidden bg-muted">
              <img loading="lazy" decoding="async" src={imageUrl} alt="Scan" className="w-full aspect-square object-cover" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white grid place-items-center"
              >
                <X className="size-4" />
              </button>
              {scanMut.isPending && (
                <div className="absolute inset-0 bg-black/50 grid place-items-center text-white">
                  <div className="flex flex-col items-center gap-2 px-6 text-center">
                    <Loader2 className="size-8 animate-spin" />
                    <p className="text-sm font-medium">Menganalisis foto…</p>
                    <p className="text-[11px] text-white/80 max-w-[220px]">
                      Hasilnya bisa kamu cek lagi sebelum simpan.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <MealTypePicker value={mealType} onChange={setMealType} />

            {scanMut.isError && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-center space-y-1"
              >
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Scan belum berhasil
                </p>
                <p className="text-xs text-muted-foreground">
                  Coba foto ulang dengan cahaya lebih terang, atau tambah manual.
                </p>
              </div>
            )}

            <ScanItemsList
              items={items}
              originals={originals}
              editIdx={editIdx}
              setEditIdx={setEditIdx}
              onUpdate={updateItem}
              onLog={(it, idx) => logMut.mutate({ it, idx })}
              onLogAll={() => items.forEach((it, idx) => logMut.mutate({ it, idx }))}
              onDone={() => navigate({ to: "/dashboard" })}
              logPending={logMut.isPending}
            />

            {!scanMut.isPending && items.length === 0 && !scanMut.isError && (
              <div className="rounded-3xl border border-dashed border-border bg-card p-6 text-center space-y-2">
                <p className="font-semibold text-sm">Belum terbaca jelas</p>
                <p className="text-xs text-muted-foreground">
                  Coba foto lebih dekat, pastikan makanan terlihat penuh, atau tambah manual.
                </p>
              </div>
            )}

            {!scanMut.isPending && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => imageUrl && scanMut.mutate(imageUrl)}
                  className="py-3 rounded-xl bg-muted text-foreground font-semibold text-sm min-h-11"
                  aria-label="Pindai ulang foto"
                >
                  Pindai ulang
                </button>
                <Link
                  to="/food"
                  className="py-3 rounded-xl bg-card border text-foreground font-semibold text-sm min-h-11 inline-flex items-center justify-center"
                  aria-label="Tambah makanan secara manual"
                >
                  Tambah manual
                </Link>
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
