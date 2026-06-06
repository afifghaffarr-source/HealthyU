import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { parseMenuImage } from "@/features/scan/lib/scanExtras.functions";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validateImageFile, fileToDataUrl } from "@/lib/image-utils";

export const Route = createFileRoute("/_authenticated/scan/menu")({ component: Page });

function Page() {
  const ref = useRef<HTMLInputElement>(null);
  const [img, setImg] = useState<string | null>(null);
  const parse = useServerFn(parseMenuImage);
  const m = useMutation({
    mutationFn: (url: string) => parse({ data: { image_data_url: url } }),
    onError: (e: Error) => toast.error(e.message),
  });
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
        {m.data?.items && m.data.items.length > 0 && (
          <div className="space-y-2">
            {m.data.items.map((it, i) => (
              <div key={i} className="rounded-2xl bg-card border p-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{it.name}</div>
                    {it.description && (
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {it.description}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    {it.price ? (
                      <div className="font-semibold">Rp{it.price.toLocaleString("id-ID")}</div>
                    ) : null}
                    {it.est_calories ? (
                      <div className="text-primary">{it.est_calories} kkal</div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
