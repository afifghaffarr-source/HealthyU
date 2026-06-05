import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Camera, Loader2, Sparkles, X, History, Zap } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { recognizeFood, submitScanCorrection } from "@/features/food/lib/foodScan.functions";
import { attachScanPhoto } from "@/features/scan/lib/scanPhoto.functions";
import { recordScanGameify, checkScanLimit, classifyMealTags } from "@/features/scan/lib/scanMore.functions";
import { logMeal } from "@/features/meals/lib/meals.functions";
import { ScanItemsList } from "@/features/scan/components/ScanItemsList";
import {
  MEAL_TYPES,
  pickDefaultMealType,
  fileToDataUrl,
} from "@/features/scan/lib/scanHelpers";
import { MealTypePicker } from "@/features/scan/components/MealTypePicker";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

type Item = Awaited<ReturnType<typeof recognizeFood>>["items"][number];

function ScanPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const scan = useServerFn(recognizeFood);
  const log = useServerFn(logMeal);
  const correct = useServerFn(submitScanCorrection);
  const upload = useServerFn(attachScanPhoto);
  const gameify = useServerFn(recordScanGameify);
  const limitFn = useServerFn(checkScanLimit);
  const classify = useServerFn(classifyMealTags);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [originals, setOriginals] = useState<Item[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [usePro, setUsePro] = useState(false);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["v"]>(pickDefaultMealType());

  const scanMut = useMutation({
    mutationFn: async (dataUrl: string) =>
      scan({ data: { image_data_url: dataUrl, use_pro: usePro } }),
    onSuccess: (res) => {
      setItems(res.items);
      setOriginals(res.items.map((i) => ({ ...i })));
      setScanId(res.scan_id);
      if (res.scan_id && imageUrl) {
        upload({ data: { scan_id: res.scan_id, image_data_url: imageUrl } }).catch(() => {});
      }
      if (res.scan_id) {
        gameify()
          .then((g) => {
            if (g.coinsAwarded) toast.success(`+${g.coinsAwarded} 🪙 · Streak ${g.streak} hari`);
            g.unlocked.forEach((id) => toast.success(`🏆 Achievement: ${id}`));
          })
          .catch(() => {});
        // allergen/halal check on first item
        if (res.items[0]) {
          classify({ data: { name: res.items[0].name } })
            .then((t) => {
              if (t.allergy_warning) toast.warning(`⚠️ ${t.allergy_warning}`);
              if (t.halal === false) toast.warning("⚠️ Mungkin tidak halal");
            })
            .catch(() => {});
        }
      }
      if (res.items.length === 0) toast.error("Tidak ada makanan terdeteksi");
      else toast.success(`${res.items.length} makanan dikenali`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logMut = useMutation({
    mutationFn: async (payload: { it: Item; idx: number }) => {
      const { it, idx } = payload;
      const orig = originals[idx];
      const changed =
        orig &&
        (orig.name !== it.name ||
          Math.round(orig.calories) !== Math.round(it.calories) ||
          Math.round(orig.portion_g ?? 0) !== Math.round(it.portion_g ?? 0) ||
          Math.round(orig.protein_g) !== Math.round(it.protein_g) ||
          Math.round(orig.carbs_g) !== Math.round(it.carbs_g) ||
          Math.round(orig.fat_g) !== Math.round(it.fat_g));
      if (changed) {
        // fire-and-forget audit
        correct({ data: { scan_id: scanId, original: orig, corrected: it } }).catch(() => {});
      }
      return log({
        data: {
          food_item_id: it.matched_food_id ?? null,
          custom_name: it.matched_food_id ? null : it.name,
          meal_type: mealType,
          serving_qty: 1,
          calories: Math.round(it.calories),
          protein_g: Math.round(it.protein_g),
          carbs_g: Math.round(it.carbs_g),
          fat_g: Math.round(it.fat_g),
        },
      });
    },
    onSuccess: (_res, payload) => {
      toast.success(`${payload.it.name} dicatat`);
      setItems((prev) => prev.filter((_, i) => i !== payload.idx));
      setOriginals((prev) => prev.filter((_, i) => i !== payload.idx));
      if (editIdx === payload.idx) setEditIdx(null);
    },
    onError: (e: Error) => toast.error(e.message),
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
        <div className="flex items-center justify-between rounded-2xl bg-card border px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="size-3.5 text-primary" />
            <span>
              Mode AI: <b>{usePro ? "Pro (akurat)" : "Flash (cepat)"}</b>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setUsePro((v) => !v)}
            className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium inline-flex items-center gap-1"
          >
            <Zap className="size-3" /> {usePro ? "Pakai Flash" : "Pakai Pro"}
          </button>
        </div>
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
                AI akan mengenali nama, porsi, dan kalori secara otomatis
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
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin" />
                    <p className="text-sm font-medium">Mengenali makanan...</p>
                  </div>
                </div>
              )}
            </div>

            <MealTypePicker value={mealType} onChange={setMealType} />

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

            {!scanMut.isPending && items.length === 0 && (
              <button
                onClick={() => imageUrl && scanMut.mutate(imageUrl)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
              >
                Pindai Ulang
              </button>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
