import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { parseMenuImage } from "@/features/scan/lib/scanExtras.functions";
import { ComboDetectionChip } from "@/features/scan/components/ComboDetectionChip";
import { PostScanAdjuster } from "@/features/scan/components/PostScanAdjuster";
import { logMealWithItems } from "@/features/meals/lib/meals.functions";
import { addMeal } from "@/features/meals/lib/mealDexie";
import { mapAdjustedToLogItems, detectWarungMealType } from "@/features/scan/lib/warungSave";
import { syncMealLogs } from "@/lib/dexie-sync";
import { track } from "@/lib/errorReporting";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { validateImageFile, fileToDataUrl } from "@/lib/image-utils";

export const Route = createFileRoute("/_authenticated/scan/menu")({ component: Page });

function Page() {
  const ref = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const [showCombo, setShowCombo] = useState(true);
  const parse = useServerFn(parseMenuImage);
  const saveFn = useServerFn(logMealWithItems);
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (url: string) => parse({ data: { image_data_url: url } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const saveMut = useMutation({
    // Use ReturnType to dodge TanStack Start's complex inferred type for
    // server-fn factories — we only need the input shape here.
    mutationFn: (input: {
      meal_type: "breakfast" | "lunch" | "dinner" | "snack";
      items: Array<{
        food_item_id: string | null;
        food_name: string;
        serving_qty: number;
        serving_unit: string | null;
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
      }>;
      notes?: string;
    }) => saveFn({ data: input }),
  });

  const handleRescan = () => {
    setImg(null);
    setShowCombo(true);
    m.reset();
    ref.current?.click();
  };

  // Sprint 22 + Sprint 23 — Nasi Intelligence + Offline Diary Mode.
  //
  // Write-through pattern:
  //   1. Write to Dexie IMMEDIATELY (instant UX feedback even offline)
  //   2. Try to push to Supabase now
  //   3. If online + push succeeds → orchestrator later flips row to "synced"
  //      If offline OR push fails → row stays "pending"; syncMealLogs()
  //        picks it up within 30s of reconnect.
  //
  // Unblocks: Pola Gagal Diet detection sees complete meal data even with
  // network gaps. User scan iftar during Ramadhan / via 3G tetap tercatat.
  const handleSave = async (
    adjustedItems: Array<{
      name: string;
      canonical_name?: string | null;
      food_item_id?: number | string | null;
      adjusted_portion_g: number;
      adjusted_calories: number;
      est_protein_g?: number;
      est_carbs_g?: number;
      est_fat_g?: number;
      est_portion_g?: number;
      // verified_nutrition is the full TKPI block when the AI matched an
      // existing food_items row. We only need serving_unit at the route
      // level — the mapper reads the rest from the same object.
      verified_nutrition?: {
        calories: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        fiber_g?: number;
        serving_size: number;
        serving_unit: string;
        portion_label?: string | null;
      } | null;
    }>,
  ) => {
    const items = mapAdjustedToLogItems(adjustedItems);
    const totalCal = items.reduce((s, i) => s + i.calories * i.serving_qty, 0);
    const mealType = detectWarungMealType(adjustedItems);
    const notes = `Scan Warung: ${adjustedItems.length} item (${totalCal} kkal)`;
    const wasOffline = typeof navigator !== "undefined" && !navigator.onLine;

    try {
      // Step 1: persist locally so offline users get instant feedback.
      // Dexie write is best-effort — failure here falls back to direct
      // server call below (no offline durability, but no UI breakage either).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await addMeal({ user_id: user.id, meal_type: mealType, items, notes });
        } catch (dexieErr) {
          void track("scan.warung.dexie_local_save_failed", {
            error: dexieErr instanceof Error ? dexieErr.message : "unknown",
          });
        }
      }

      // Step 2: direct server push when online. Offline users skip this
      // entirely and rely on the orchestrator (next poll = within 30s).
      let serverSyncOk = false;
      if (!wasOffline) {
        try {
          await saveMut.mutateAsync({ meal_type: mealType, items, notes });
          serverSyncOk = true;
        } catch {
          serverSyncOk = false;
        }
      }

      const syncedNote = serverSyncOk
        ? "tersinkronisasi"
        : wasOffline
          ? "tersimpan lokal — akan sync otomatis saat online"
          : "tersimpan lokal — akan retry sync";
      toast.success(
        `${adjustedItems.length} item ${syncedNote} (${totalCal} kkal) · lihat /profile/insights untuk pola kamu`,
      );

      void track("scan.warung.saved", {
        items_count: adjustedItems.length,
        total_calories: totalCal,
        meal_type: mealType,
        saved_offline: wasOffline,
        server_sync_ok: serverSyncOk,
      });

      qc.invalidateQueries({ queryKey: ["pattern-insights"] });
      // Try a manual sync in case we're reconnecting from sleep — cheap
      // when queue is empty.
      void syncMealLogs();
    } catch (e) {
      toastError(e as Error, "Gagal menyimpan hasil scan");
    } finally {
      setTimeout(() => {
        setImg(null);
        setShowCombo(true);
        m.reset();
        saveMut.reset();
      }, 1500);
    }
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
              type="button"
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
