import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { restaurantsNearby } from "@/lib/scanBatch8.functions";
import { MapPin, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/restaurants/nearby")({ component: Page });

function Page() {
  const fn = useServerFn(restaurantsNearby);
  const [list, setList] = useState<any[]>([]);
  const mut = useMutation({
    mutationFn: (loc: { lat: number; lng: number }) => fn({ data: loc }),
    onSuccess: (r) => setList(r.restaurants),
  });
  const locate = () => {
    navigator.geolocation.getCurrentPosition((pos) =>
      mut.mutate({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    );
  };
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Restoran Terdekat" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        <button onClick={locate} disabled={mut.isPending} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 inline-flex items-center justify-center gap-2">
          {mut.isPending ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          Cari di sekitar saya
        </button>
        {list.map((r) => (
          <div key={r.id} className="rounded-xl bg-card border p-3">
            <h4 className="font-semibold">{r.name}</h4>
            <p className="text-xs text-muted-foreground">{r.address}</p>
          </div>
        ))}
        {list.length === 0 && !mut.isPending && <p className="text-sm text-muted-foreground text-center py-8">Tekan tombol untuk mencari</p>}
      </main>
      <BottomNav />
    </div>
  );
}