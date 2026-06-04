import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/_authenticated/meal-detail/$id")({
  component: MealDetailPage,
});

function MealDetailPage() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen pb-28 px-4">
      <TopAppBar title="Detail Menu" showBack />
      <div className="mt-4 aspect-video rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
        Video / Foto
      </div>
      <h2 className="mt-4 text-xl font-bold">Menu #{id}</h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Kkal", value: "420" },
          { label: "Protein", value: "28g" },
          { label: "Karbo", value: "45g" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-card p-3 border border-border/40 text-center">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="font-bold text-primary">{s.value}</p>
          </div>
        ))}
      </div>
      <button
        onClick={() => toast.success("Ditambahkan ke diary")}
        className="mt-6 w-full rounded-2xl bg-primary text-primary-foreground py-3 font-semibold"
      >
        Tambah ke Diary
      </button>
      <BottomNav />
    </div>
  );
}