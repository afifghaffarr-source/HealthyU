import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import {
  listPetAccessories,
  buyPetAccessory,
  equipPetAccessory,
} from "@/features/scan/lib/scanBatch7.functions";
import { toast } from "@/lib/toast-config";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/pet/shop")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const listFn = useServerFn(listPetAccessories);
  const buyFn = useServerFn(buyPetAccessory);
  const eqFn = useServerFn(equipPetAccessory);
  const { data } = useQuery({
    queryKey: ["pet-shop"],
    queryFn: () => listFn({ data: undefined as never }),
  });
  const buy = useMutation({
    mutationFn: (id: string) => buyFn({ data: { accessoryId: id } }),
    onSuccess: () => {
      toast.success(t("pet.shop.bought"));
      qc.invalidateQueries({ queryKey: ["pet-shop"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const eq = useMutation({
    mutationFn: (v: { id: string; equipped: boolean }) => eqFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pet-shop"] }),
  });
  const { t } = useTranslation();
  const ownedMap = new Map((data?.owned ?? []).map((o) => [o.accessory_id, o]));
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title={t("pet.shop.title")} showBack />
      <main className="max-w-md mx-auto px-4 pt-4 grid grid-cols-2 gap-3">
        {(data?.shop ?? []).map((a) => {
          const owned = ownedMap.get(a.id);
          return (
            <div key={a.id} className="rounded-2xl bg-card border p-4 text-center space-y-2">
              <div className="text-4xl">{a.emoji}</div>
              <div className="font-medium text-sm">{a.name}</div>
              {owned ? (
                <button
                  onClick={() => eq.mutate({ id: owned.id, equipped: !owned.equipped })}
                  className={`w-full rounded-lg py-1.5 text-xs ${owned.equipped ? "bg-primary text-primary-foreground" : "border"}`}
                >
                  {owned.equipped ? t("pet.shop.equipped") : t("pet.shop.equip")}
                </button>
              ) : (
                <button
                  disabled={buy.isPending}
                  onClick={() => buy.mutate(a.id)}
                  className="w-full rounded-lg border py-1.5 text-xs"
                >
                  {t("pet.shop.buy", { cost: a.cost_coins })}
                </button>
              )}
            </div>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}
