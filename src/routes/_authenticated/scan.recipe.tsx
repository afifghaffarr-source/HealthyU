import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { parseRecipeImage } from "@/features/scan/lib/scanExtras.functions";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile, fileToDataUrl } from "@/lib/image-utils";

export const Route = createFileRoute("/_authenticated/scan/recipe")({ component: Page });

function Page() {
  const ref = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const parse = useServerFn(parseRecipeImage);
  const m = useMutation({
    mutationFn: (url: string) => parse({ data: { image_data_url: url } }),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Scan Resep" showBack />
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
            m.mutate(url);
          }}
        />
        {!img ? (
          <button
            onClick={() => ref.current?.click()}
            className="w-full py-12 rounded-2xl bg-card border border-dashed flex flex-col items-center gap-2 text-sm text-muted-foreground"
          >
            <Camera className="size-8" /> Foto resep
          </button>
        ) : (
          <img
            loading="lazy"
            decoding="async"
            src={img}
            className="w-full rounded-2xl"
            alt="resep"
          />
        )}
        {m.isPending && (
          <div className="text-center text-sm">
            <Loader2 className="inline size-4 animate-spin" /> Mengekstrak bahan…
          </div>
        )}
        {m.data && (
          <div className="space-y-3">
            {m.data.title && <div className="text-lg font-bold">{m.data.title}</div>}
            {m.data.ingredients && m.data.ingredients.length > 0 && (
              <div className="rounded-2xl bg-card border p-4">
                <div className="text-sm font-medium mb-2">Bahan</div>
                <ul className="space-y-1 text-sm">
                  {m.data.ingredients.map((ing, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{ing.name}</span>
                      <span className="text-muted-foreground">
                        {ing.qty} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {m.data.steps && m.data.steps.length > 0 && (
              <div className="rounded-2xl bg-card border p-4">
                <div className="text-sm font-medium mb-2">Langkah</div>
                <ol className="space-y-1.5 text-sm list-decimal pl-5">
                  {m.data.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
