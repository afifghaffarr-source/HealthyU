import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listProgress,
  addProgress,
  deleteProgress,
} from "@/features/progress/lib/progress.functions";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { todaysMeals } from "@/features/meals/lib/meals.functions";
import { todaysWater } from "@/features/water/lib/water.functions";
import {
  GoalRadialCard,
  ProgressPhotoGrid,
  TimelapseButton,
  UploadProgressCard,
} from "@/features/progress/components/ProgressPieces";
import { NonScaleWinsCard } from "@/features/progress/components/NonScaleWinsCard";

export const Route = createFileRoute("/_authenticated/progress")({
  component: ProgressPage,
});

function ProgressPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listProgress);
  const add = useServerFn(addProgress);
  const del = useServerFn(deleteProgress);
  const { data: photos = [] } = useQuery({ queryKey: ["progress"], queryFn: () => fetchList() });
  const fetchProfile = useServerFn(getProfile);
  const fetchMeals = useServerFn(todaysMeals);
  const fetchWater = useServerFn(todaysWater);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const { data: meals = [] } = useQuery({
    queryKey: ["meals", "today"],
    queryFn: () => fetchMeals(),
  });
  const { data: waterMl = 0 } = useQuery({
    queryKey: ["water", "today"],
    queryFn: () => fetchWater(),
  });
  const cal = meals.reduce((a, m) => a + Number(m.calories || 0), 0);
  const calTarget = profile?.daily_calorie_target ?? 2000;
  const waterTarget = 2500;
  const goalData = [
    { name: "Kalori", value: Math.min(100, (cal / calTarget) * 100), fill: "hsl(var(--primary))" },
    { name: "Air", value: Math.min(100, (waterMl / waterTarget) * 100), fill: "#0ea5e9" },
    { name: "Foto", value: photos.length > 0 ? 100 : 0, fill: "#f97316" },
  ];

  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);

  const delMut = useMutation({
    mutationFn: (v: { id: string; photo_url: string }) => del({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Tidak login");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("progress-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      await add({
        data: {
          photo_url: path,
          weight_kg: weight ? Number(weight) : undefined,
          notes: notes || undefined,
        },
      });
      setWeight("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["progress"] });
      toast.success("Foto progres tersimpan");
    } catch (e) {
      toastError(e, "Gagal upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Foto Progres" subtitle="Pantau perubahan kamu" showBack />

        <GoalRadialCard data={goalData} />

        <NonScaleWinsCard
          mealsLogged={meals.length}
          waterReached={waterMl >= waterTarget}
          photosCount={photos.length}
          calorieOnTrack={cal > 0 && cal <= calTarget}
        />

        <UploadProgressCard
          weight={weight}
          setWeight={setWeight}
          notes={notes}
          setNotes={setNotes}
          uploading={uploading}
          onPickFile={handleUpload}
        />

        {photos.length >= 2 && (
          <TimelapseButton
            photos={photos
              .filter((p): p is typeof p & { signed_url: string } => Boolean(p.signed_url))
              .map((p) => ({ url: p.signed_url!, taken_at: p.taken_at }))}
          />
        )}

        <ProgressPhotoGrid
          photos={photos}
          onDelete={(id, photo_url) => delMut.mutate({ id, photo_url })}
        />

        {photos.length === 0 && (
          <div className="text-center py-6 space-y-1">
            <p className="text-sm font-medium">Belum ada foto progres</p>
            <p className="text-xs text-muted-foreground">
              Foto pertama jadi titik awal — progres bertahap, bukan harus sempurna.
            </p>
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}