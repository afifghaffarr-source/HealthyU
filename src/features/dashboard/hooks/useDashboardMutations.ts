import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { logWater } from "@/features/water/lib/water.functions";
import { addMood } from "@/features/mood/lib/mood.functions";
import { claimDailyLoginBonus } from "@/features/scan/lib/scanBatch9.functions";
import { getAchievementToastPrefix } from "@/lib/achievement-icons";
import { useAnnounce } from "@/components/live-announcer";
import { useState } from "react";

export function useDashboardMutations() {
  const qc = useQueryClient();
  const announce = useAnnounce();
  const logWaterFn = useServerFn(logWater);
  const addMoodFn = useServerFn(addMood);
  const claimBonusFn = useServerFn(claimDailyLoginBonus);

  const [bonusClaimed, setBonusClaimed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("dailyBonusClaimed") === new Date().toDateString();
  });

  const claimBonusMut = useMutation({
    mutationFn: () => claimBonusFn({ data: undefined as never }),
    onSuccess: (r) => {
      const b = r.bonus as { coins?: number; streak?: number } | undefined;
      window.localStorage.setItem("dailyBonusClaimed", new Date().toDateString());
      setBonusClaimed(true);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(
        r.alreadyClaimed
          ? "Sudah klaim hari ini"
          : `+${b?.coins ?? 0} koin! Streak ${b?.streak ?? 0}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const waterMutation = useMutation({
    mutationFn: (ml: number) => logWaterFn({ data: { amount_ml: ml } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["water", "today"] });
      qc.invalidateQueries({ queryKey: ["game", "summary"] });
      toast.success("+250ml dicatat");
      announce("250 mililiter air tercatat");
      const newlyUnlocked = res?.game?.newlyUnlocked ?? [];
      newlyUnlocked.forEach((a) =>
        toast.success(`${getAchievementToastPrefix(a.icon)} ${a.title} terbuka!`),
      );
    },
  });

  const moodMutation = useMutation({
    mutationFn: (mood: number) => addMoodFn({ data: { mood } }),
    onSuccess: (_r, mood) => {
      qc.invalidateQueries({ queryKey: ["mood"] });
      toast.success("Mood tercatat");
      announce(`Mood ${mood} dari 5 tercatat`);
    },
  });

  return { bonusClaimed, claimBonusMut, waterMutation, moodMutation };
}