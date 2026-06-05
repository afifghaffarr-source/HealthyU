import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Zap, Drumstick, Smile, Sparkles } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { ListSkeleton } from "@/components/healthyu/skeletons";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { getPet, adoptPet, interactPet } from "@/lib/pet.functions";

export const Route = createFileRoute("/_authenticated/pet")({
  component: PetPage,
});

const PET_EMOJI: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
  panda: "🐼",
  fox: "🦊",
};

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function PetPage() {
  const qc = useQueryClient();
  const fetchPet = useServerFn(getPet);
  const adoptFn = useServerFn(adoptPet);
  const interactFn = useServerFn(interactPet);

  const { data, isLoading } = useQuery({ queryKey: ["pet"], queryFn: () => fetchPet() });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["pet"] });

  const [name, setName] = useState("");
  const [type, setType] = useState<"cat" | "dog" | "rabbit" | "panda" | "fox">("cat");

  const adoptM = useMutation({
    mutationFn: () => adoptFn({ data: { pet_name: name.trim(), pet_type: type } }),
    onSuccess: () => {
      toast.success("Pet diadopsi!");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actM = useMutation({
    mutationFn: (action: "feed" | "play" | "rest") => interactFn({ data: { action } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const pet = data?.pet;

  return (
    <div className="min-h-dvh pb-32">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar title="Virtual Pet" showBack />
      </div>
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {isLoading && <ListSkeleton count={2} />}
        {!isLoading && !pet && (
          <div className="rounded-3xl bg-card outline-1 outline-black/5 p-5 space-y-4">
            <h2 className="font-semibold">Adopsi pet kamu</h2>
            <p className="text-xs text-muted-foreground">
              Pet akan tumbuh seiring kebiasaan sehatmu.
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama pet"
              maxLength={40}
              className="w-full h-11 px-4 rounded-2xl bg-muted text-sm outline-none"
            />
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(PET_EMOJI) as Array<keyof typeof PET_EMOJI>).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t as typeof type)}
                  className={`h-14 rounded-2xl text-2xl ${type === t ? "bg-primary/15 outline-2 outline-primary" : "bg-muted"}`}
                >
                  {PET_EMOJI[t]}
                </button>
              ))}
            </div>
            <button
              disabled={!name.trim() || adoptM.isPending}
              onClick={() => adoptM.mutate()}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              Adopsi
            </button>
          </div>
        )}
        {pet && (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 p-6 text-center">
              <div className="text-7xl">{PET_EMOJI[pet.pet_type] ?? "🐾"}</div>
              <h2 className="font-bold text-lg mt-2">{pet.pet_name}</h2>
              <p className="text-xs text-muted-foreground">
                Lv {pet.evolution_stage} · {pet.evolution_points} EXP
              </p>
              {(() => {
                const stage = Number(pet.evolution_stage ?? 1);
                const exp = Number(pet.evolution_points ?? 0);
                const nextLv = stage * 100;
                const prevLv = (stage - 1) * 100;
                const pct = Math.min(100, Math.max(0, ((exp - prevLv) / (nextLv - prevLv)) * 100));
                return (
                  <div className="mt-3">
                    <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {Math.max(0, nextLv - exp)} EXP menuju Lv {stage + 1}
                    </p>
                  </div>
                );
              })()}
            </div>
            <div className="rounded-3xl bg-card outline-1 outline-black/5 p-5 space-y-3">
              <Stat
                icon={<Heart className="size-3 text-rose-500" />}
                label="Health"
                value={pet.health_stat}
                color="bg-rose-500"
              />
              <Stat
                icon={<Smile className="size-3 text-amber-500" />}
                label="Happiness"
                value={pet.happiness_stat}
                color="bg-amber-500"
              />
              <Stat
                icon={<Zap className="size-3 text-sky-500" />}
                label="Energy"
                value={pet.energy_stat}
                color="bg-sky-500"
              />
              <Stat
                icon={<Drumstick className="size-3 text-orange-600" />}
                label="Hunger"
                value={pet.hunger_stat}
                color="bg-orange-600"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => actM.mutate("feed")}
                disabled={actM.isPending}
                className="h-12 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                Beri makan
              </button>
              <button
                onClick={() => actM.mutate("play")}
                disabled={actM.isPending}
                className="h-12 rounded-2xl bg-amber-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Main
              </button>
              <button
                onClick={() => actM.mutate("rest")}
                disabled={actM.isPending}
                className="h-12 rounded-2xl bg-sky-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Istirahat
              </button>
            </div>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
