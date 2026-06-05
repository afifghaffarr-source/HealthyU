import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { recognizeFood, submitScanCorrection } from "@/features/food/lib/foodScan.functions";
import { attachScanPhoto } from "@/features/scan/lib/scanPhoto.functions";
import { recordScanGameify, classifyMealTags } from "@/features/scan/lib/scanMore.functions";
import { logMeal } from "@/features/meals/lib/meals.functions";

type Item = Awaited<ReturnType<typeof recognizeFood>>["items"][number];

type ScanMutOpts = {
  usePro: boolean;
  imageUrl: string | null;
  setItems: (items: Item[]) => void;
  setOriginals: (items: Item[]) => void;
  setScanId: (id: string | null) => void;
};

export function useScanRecognizeMutation(opts: ScanMutOpts) {
  const scan = useServerFn(recognizeFood);
  const upload = useServerFn(attachScanPhoto);
  const gameify = useServerFn(recordScanGameify);
  const classify = useServerFn(classifyMealTags);
  return useMutation({
    mutationFn: async (dataUrl: string) =>
      scan({ data: { image_data_url: dataUrl, use_pro: opts.usePro } }),
    onSuccess: (res) => {
      opts.setItems(res.items);
      opts.setOriginals(res.items.map((i) => ({ ...i })));
      opts.setScanId(res.scan_id);
      if (res.scan_id && opts.imageUrl) {
        upload({ data: { scan_id: res.scan_id, image_data_url: opts.imageUrl } }).catch(() => {});
      }
      if (res.scan_id) {
        gameify()
          .then((g) => {
            if (g.coinsAwarded) toast.success(`+${g.coinsAwarded} 🪙 · Streak ${g.streak} hari`);
            g.unlocked.forEach((id) => toast.success(`🏆 Achievement: ${id}`));
          })
          .catch(() => {});
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
}

type LogMutOpts = {
  originals: Item[];
  scanId: string | null;
  mealType: string;
  editIdx: number | null;
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  setOriginals: React.Dispatch<React.SetStateAction<Item[]>>;
  setEditIdx: (n: number | null) => void;
};

export function useScanLogMutation(opts: LogMutOpts) {
  const log = useServerFn(logMeal);
  const correct = useServerFn(submitScanCorrection);
  return useMutation({
    mutationFn: async (payload: { it: Item; idx: number }) => {
      const { it, idx } = payload;
      const orig = opts.originals[idx];
      const changed =
        orig &&
        (orig.name !== it.name ||
          Math.round(orig.calories) !== Math.round(it.calories) ||
          Math.round(orig.portion_g ?? 0) !== Math.round(it.portion_g ?? 0) ||
          Math.round(orig.protein_g) !== Math.round(it.protein_g) ||
          Math.round(orig.carbs_g) !== Math.round(it.carbs_g) ||
          Math.round(orig.fat_g) !== Math.round(it.fat_g));
      if (changed) {
        correct({ data: { scan_id: opts.scanId, original: orig, corrected: it } }).catch(() => {});
      }
      return log({
        data: {
          food_item_id: it.matched_food_id ?? null,
          custom_name: it.matched_food_id ? null : it.name,
          meal_type: opts.mealType,
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
      opts.setItems((prev) => prev.filter((_, i) => i !== payload.idx));
      opts.setOriginals((prev) => prev.filter((_, i) => i !== payload.idx));
      if (opts.editIdx === payload.idx) opts.setEditIdx(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}