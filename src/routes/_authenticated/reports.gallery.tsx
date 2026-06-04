import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { listScanGallery } from "@/lib/scanPhoto.functions";
import { ImageOff } from "lucide-react";

const opts = queryOptions({ queryKey: ["scan-gallery"], queryFn: () => listScanGallery() });

export const Route = createFileRoute("/_authenticated/reports/gallery")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

type Detected = { name?: string };

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Galeri Foto Makanan" showBack />
      <div className="p-4">
        {data.items.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <ImageOff className="mx-auto h-10 w-10 opacity-40 mb-2" />
            Belum ada foto scan
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5">
          {data.items.map((it) => {
            const foods = (it.detected_foods as Detected[] | null) ?? [];
            const label = foods
              .map((f) => f?.name)
              .filter(Boolean)
              .slice(0, 2)
              .join(", ");
            return (
              <div
                key={it.id}
                className="relative aspect-square rounded-xl overflow-hidden bg-muted group"
              >
                {it.url ? (
                  <img
                    src={it.url}
                    alt={label || "scan"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-muted-foreground">
                    <ImageOff className="size-5" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <div className="text-[10px] text-white font-semibold truncate">
                    {label || "—"}
                  </div>
                  <div className="text-[9px] text-white/80">
                    {Math.round(it.total_calories)} kkal
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
