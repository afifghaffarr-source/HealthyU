import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { recipeFromFridge } from "@/features/scan/lib/scanBatch11.functions";
import { validateImageFile, fileToDataUrl } from "@/lib/image-utils";
import { toast } from "@/lib/toast-config";
import { useTranslation } from "@/lib/i18n";
import { FeatureDisabled } from "@/components/healthyu/FeatureDisabled";

export const Route = createFileRoute("/_authenticated/scan/fridge")({ component: Page });

function Page() {
  const { t } = useTranslation();
  const fn = useServerFn(recipeFromFridge);
  const [preview, setPreview] = useState<string | null>(null);
  const [b64, setB64] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { imageBase64: b64 } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const onPick = async (f: File | null) => {
    if (!f) return;
    try {
      validateImageFile(f);
    } catch (err) {
      toast.error((err as Error).message);
      return;
    }
    const dataUrl = await fileToDataUrl(f);
    setPreview(dataUrl);
    setB64(dataUrl.split(",")[1] ?? "");
  };
  type FridgeRecipe = { name: string; steps?: string[] };
  type FridgeResult = { ingredients?: string[]; recipes?: FridgeRecipe[] };
  const r = mut.data?.result as FridgeResult | undefined;
  return (
    <FeatureDisabled
      flag="feature.scan_photo"
      titleKey="scanPhoto.featDisabled"
      descKey="scanPhoto.featDisabledDesc"
    >
      <div className="min-h-dvh pb-24 bg-background">
        <TopAppBar title={t("scan.fridgeTitle")} showBack />
        <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
          {preview && (
            <img
              loading="lazy"
              decoding="async"
              src={preview}
              alt="Fridge contents preview"
              className="w-full rounded-xl"
            />
          )}
          <button
            onClick={() => mut.mutate()}
            disabled={!b64 || mut.isPending}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
          >
            {mut.isPending ? "AI menganalisis…" : "Cari Resep"}
          </button>
          {r?.ingredients && (
            <div className="rounded-2xl bg-card border p-3 text-sm">
              <b>Bahan terdeteksi:</b> {r.ingredients.join(", ")}
            </div>
          )}
          {(r?.recipes ?? []).map((rec, i) => (
            <div key={i} className="rounded-2xl bg-card border p-3 text-sm space-y-1">
              <div className="font-semibold">{rec.name}</div>
              <ol className="list-decimal pl-5 space-y-0.5">
                {(rec.steps ?? []).map((s: string, j: number) => (
                  <li key={j}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </main>
        <BottomNav />
      </div>
    </FeatureDisabled>
  );
}
