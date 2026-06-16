import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { donateCoins } from "@/features/scan/lib/scanBatch11.functions";
import { toast } from "@/lib/toast-config";
import { Heart } from "lucide-react";

const CHARITIES = ["Yayasan Anak Sehat", "Bank Sampah Hijau", "Pemberdayaan Petani"];

export const Route = createFileRoute("/_authenticated/charity")({ component: Page });

function Page() {
  const fn = useServerFn(donateCoins);
  const [coins, setCoins] = useState(50);
  const [charity, setCharity] = useState(CHARITIES[0]);
  const mut = useMutation({
    mutationFn: () => fn({ data: { coins, charityName: charity } }),
    onSuccess: () => toast.success(`Terima kasih! ${coins} coin disumbang ke ${charity}`),
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Donasi Coin" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="text-center py-4">
          <Heart className="size-12 text-red-500 mx-auto" />
        </div>
        <select
          value={charity}
          onChange={(e) => setCharity(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border bg-card"
        >
          {CHARITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={10}
          value={coins}
          onChange={(e) => setCoins(Number(e.target.value))}
          className="w-full px-3 py-2 rounded-xl border bg-card"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
        >
          Donasi {coins} Coin
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
