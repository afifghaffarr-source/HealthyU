import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { Camera, Loader2, Sparkles, X, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { recognizeFood, submitScanCorrection } from "@/lib/foodScan.functions";
import { logMeal } from "@/lib/meals.functions";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

type Item = Awaited<ReturnType<typeof recognizeFood>>["items"][number];

const MEAL_TYPES = [
  { v: "breakfast", l: "Sarapan" },
  { v: "lunch", l: "Makan Siang" },
  { v: "dinner", l: "Makan Malam" },
  { v: "snack", l: "Camilan" },
] as const;

function pickDefaultMealType(): (typeof MEAL_TYPES)[number]["v"] {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "snack";
}

async function fileToDataUrl(file: File, maxSize = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ScanPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const scan = useServerFn(recognizeFood);
  const log = useServerFn(logMeal);
  const correct = useServerFn(submitScanCorrection);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [originals, setOriginals] = useState<Item[]>([]);
  const [scanId, setScanId] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]["v"]>(pickDefaultMealType());

  const scanMut = useMutation({
    mutationFn: async (dataUrl: string) => scan({ data: { image_data_url: dataUrl } }),
    onSuccess: (res) => {
      setItems(res.items);
      setOriginals(res.items.map((i) => ({ ...i })));
      setScanId(res.scan_id);
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
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="size-3" /> AI
            </span>
          }
        />
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
              <img src={imageUrl} alt="Scan" className="w-full aspect-square object-cover" />
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

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Jenis makan</p>
              <div className="grid grid-cols-4 gap-2">
                {MEAL_TYPES.map((m) => (
                  <button
                    key={m.v}
                    onClick={() => setMealType(m.v)}
                    className={`py-2 rounded-xl text-xs font-medium border transition ${
                      mealType === m.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/60 border-transparent text-muted-foreground"
                    }`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>
            </div>

            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Terdeteksi</p>
                {items.map((it, i) => {
                  const editing = editIdx === i;
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-card border border-border/50 space-y-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          {editing ? (
                            <input
                              value={it.name}
                              onChange={(e) => updateItem(i, { name: e.target.value })}
                              className="w-full text-sm font-semibold bg-muted/60 rounded-lg px-2 py-1 outline-none focus:bg-background border border-transparent focus:border-primary"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm truncate">{it.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {Math.round((it.confidence ?? 0) * 100)}%
                              </span>
                            </div>
                          )}
                          {!editing && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {it.portion_g ? `~${it.portion_g}g` : it.portion_ml ? `~${it.portion_ml}ml` : ""}
                              {" · "}P {Math.round(it.protein_g)}g · K {Math.round(it.carbs_g)}g · L {Math.round(it.fat_g)}g
                            </p>
                          )}
                          {it.matched_food_id && !editing && (
                            <p className="text-[10px] text-primary mt-0.5">✓ ada di database</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary text-sm">{Math.round(it.calories)}</p>
                          <p className="text-[10px] text-muted-foreground">kkal</p>
                        </div>
                        <button
                          onClick={() => setEditIdx(editing ? null : i)}
                          className="self-center size-8 rounded-lg bg-muted/60 grid place-items-center text-muted-foreground hover:text-foreground"
                          aria-label={editing ? "Tutup edit" : "Edit"}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => logMut.mutate({ it, idx: i })}
                          disabled={logMut.isPending}
                          className="self-center size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center disabled:opacity-50"
                          aria-label="Catat"
                        >
                          <Check className="size-4" />
                        </button>
                      </div>
                      {editing && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <EditField
                            label="Porsi (g)"
                            value={it.portion_g ?? 0}
                            onChange={(v) => updateItem(i, { portion_g: v })}
                          />
                          <EditField
                            label="Kalori"
                            value={Math.round(it.calories)}
                            onChange={(v) => updateItem(i, { calories: v })}
                          />
                          <EditField
                            label="Protein (g)"
                            value={Math.round(it.protein_g)}
                            onChange={(v) => updateItem(i, { protein_g: v })}
                          />
                          <EditField
                            label="Karbo (g)"
                            value={Math.round(it.carbs_g)}
                            onChange={(v) => updateItem(i, { carbs_g: v })}
                          />
                          <EditField
                            label="Lemak (g)"
                            value={Math.round(it.fat_g)}
                            onChange={(v) => updateItem(i, { fat_g: v })}
                          />
                          <div className="col-span-2 text-[10px] text-muted-foreground pt-0.5">
                            Koreksimu akan dikirim ke audit AI untuk perbaikan ke depan.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="w-full py-2 text-xs font-semibold text-primary"
                >
                  Selesai
                </button>
              </div>
            )}

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

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full text-sm bg-muted/60 rounded-lg px-2 py-1.5 outline-none focus:bg-background border border-transparent focus:border-primary"
      />
    </label>
  );
}