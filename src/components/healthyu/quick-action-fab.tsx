import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Plus, Camera, Utensils, Droplet, Dumbbell, X, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { logMeal } from "@/features/meals/lib/meals.functions";
import { toast } from "sonner";

const ACTIONS = [
  { to: "/scan", label: "Scan", icon: Camera, color: "from-primary to-accent" },
  { to: "/foods", label: "Log makan", icon: Utensils, color: "from-amber-500 to-rose-500" },
  { to: "/water", label: "Air", icon: Droplet, color: "from-sky-500 to-cyan-400" },
  { to: "/workout", label: "Latihan", icon: Dumbbell, color: "from-violet-500 to-fuchsia-500" },
];

export function QuickActionFab() {
  const [open, setOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [cal, setCal] = useState("");
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">("snack");
  const qc = useQueryClient();
  const logFn = useServerFn(logMeal);
  const mut = useMutation({
    mutationFn: () =>
      logFn({
        data: {
          food_item_id: null,
          custom_name: name.trim() || "Snack cepat",
          meal_type: mealType,
          serving_qty: 1,
          calories: Number(cal || 0),
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        },
      }),
    onSuccess: () => {
      toast.success("Makanan tercatat");
      qc.invalidateQueries({ queryKey: ["meals", "today"] });
      setSheetOpen(false);
      setName("");
      setCal("");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const loc = useLocation();
  // Sembunyikan di halaman yang sudah punya composer/aksi bawah sendiri
  // (chat, scan, food, foods) supaya FAB tidak menabrak input/CTA.
  const HIDE_ON = ["/", "/auth", "/chat", "/scan", "/food", "/foods"];
  if (HIDE_ON.some((p) => loc.pathname === p || loc.pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="fixed bottom-28 right-4 z-40 flex flex-col items-end gap-2 lg:bottom-6">
        {open && (
          <button
            onClick={() => {
              setOpen(false);
              setSheetOpen(true);
            }}
            className="flex items-center gap-2 animate-fade-up"
          >
            <span className="bg-card text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-border">
              Log cepat
            </span>
            <span className="size-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white grid place-items-center shadow-lg">
              <Zap className="size-5" />
            </span>
          </button>
        )}
        {open &&
          ACTIONS.map((a, i) => (
            <Link
              key={a.to}
              to={a.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="bg-card text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-border">
                {a.label}
              </span>
              <span
                className={`size-11 rounded-full bg-gradient-to-br ${a.color} text-white grid place-items-center shadow-lg`}
              >
                <a.icon className="size-5" />
              </span>
            </Link>
          ))}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Tutup aksi cepat" : "Buka aksi cepat"}
          className="size-14 rounded-full bg-gradient-to-br from-primary to-primary-dark text-primary-foreground shadow-xl shadow-primary/40 grid place-items-center hover:scale-105 transition-transform"
        >
          {open ? <X className="size-6" /> : <Plus className="size-6" />}
        </button>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setSheetOpen(false)}
        >
          <div
            className="w-full bg-card rounded-t-3xl p-5 space-y-3 animate-fade-up max-w-md mx-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
            <h3 className="font-bold text-base">Log makanan cepat</h3>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama makanan (mis. Nasi goreng)"
              className="w-full bg-background rounded-xl px-3 py-2.5 outline-1 outline-black/10 text-sm"
            />
            <input
              value={cal}
              onChange={(e) => setCal(e.target.value)}
              type="number"
              inputMode="numeric"
              placeholder="Kalori (kcal)"
              className="w-full bg-background rounded-xl px-3 py-2.5 outline-1 outline-black/10 text-sm"
            />
            <div className="flex gap-2">
              {(["breakfast", "lunch", "dinner", "snack"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMealType(m)}
                  className={`flex-1 text-xs py-2 rounded-lg ${mealType === m ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  {m === "breakfast"
                    ? "Pagi"
                    : m === "lunch"
                      ? "Siang"
                      : m === "dinner"
                        ? "Malam"
                        : "Snack"}
                </button>
              ))}
            </div>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !cal}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold disabled:opacity-50"
            >
              {mut.isPending ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
