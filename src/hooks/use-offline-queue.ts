import { useEffect, useState, useCallback } from "react";
import { count, flush } from "@/lib/offline-queue";
import { logWater } from "@/lib/water.functions";
import { addWeight } from "@/lib/weight.functions";
import { logMeal } from "@/lib/meals.functions";
import { addMood } from "@/lib/mood.functions";
import { addVitals } from "@/lib/vitals.functions";
import { logWorkout } from "@/lib/workouts.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";

export function useOfflineQueue() {
  const qc = useQueryClient();
  const water = useServerFn(logWater);
  const weight = useServerFn(addWeight);
  const meal = useServerFn(logMeal);
  const mood = useServerFn(addMood);
  const vitals = useServerFn(addVitals);
  const workout = useServerFn(logWorkout);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setPending(await count());
    } catch {
      /* IDB unavailable */
    }
  }, []);

  const sync = useCallback(async () => {
    const res = await flush({
      water: async (it) => {
        await water({ data: it.payload as { amount_ml: number } });
      },
      weight: async (it) => {
        await weight({ data: it.payload as { weight_kg: number; note?: string } });
      },
      meal: async (it) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await meal({ data: it.payload as any });
      },
      mood: async (it) => {
        await mood({ data: it.payload as { mood: number; note?: string } });
      },
      vitals: async (it) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await vitals({ data: it.payload as any });
      },
      workout: async (it) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await workout({ data: it.payload as any });
      },
    });
    if (res.synced > 0) {
      qc.invalidateQueries();
    }
    await refresh();
    return res;
  }, [water, weight, meal, mood, vitals, workout, qc, refresh]);

  useEffect(() => {
    refresh();
    const on = () => {
      setOnline(true);
      sync();
    };
    const off = () => setOnline(false);
    const ch = () => refresh();
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("offline-queue:changed", ch);
    if (navigator.onLine) sync();
    // periodic retry for items with backoff
    const t = setInterval(() => {
      if (navigator.onLine) sync();
    }, 5_000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("offline-queue:changed", ch);
      clearInterval(t);
    };
  }, [refresh, sync]);

  return { online, pending, sync };
}