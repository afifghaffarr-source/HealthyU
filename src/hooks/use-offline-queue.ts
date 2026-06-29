import { useEffect, useState, useCallback } from "react";
import { count, flush } from "@/lib/offline-queue";
import type { QueueKind, QueueItem } from "@/lib/offline-queue";
import { logWater } from "@/features/water/lib/water.functions";
import { addWeight } from "@/features/vitals/lib/weight.functions";
import { logMeal } from "@/features/meals/lib/meals.functions";
import { addMood } from "@/features/mood/lib/mood.functions";
import { addVitals } from "@/features/vitals/lib/vitals.functions";
import { logWorkout } from "@/features/workout/lib/workouts.functions";
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
        await meal({ data: it.payload } as Parameters<typeof meal>[0]);
      },
      mood: async (it) => {
        await mood({ data: it.payload as { mood: number; note?: string } });
      },
      vitals: async (it) => {
        await vitals({ data: it.payload } as Parameters<typeof vitals>[0]);
      },
      workout: async (it) => {
        await workout({ data: it.payload } as Parameters<typeof workout>[0]);
      },
    } as Record<QueueKind, (it: QueueItem) => Promise<void>>);
    if (res.synced > 0) {
      qc.invalidateQueries();
    }
    await refresh();
    return res;
  }, [water, weight, meal, mood, vitals, workout, qc, refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- external-store/async-query sync; `useSyncExternalStore` and equivalent restructure would change the API surface
    refresh();
    const onBrowserOnline = () => setOnline(true);
    const onBrowserOffline = () => setOnline(false);
    const onQueueChanged = () => refresh();
    window.addEventListener("online", onBrowserOnline);
    window.addEventListener("offline", onBrowserOffline);
    window.addEventListener("offline-queue:changed", onQueueChanged);

    // Passive ping to verify real connectivity — navigator.onLine is unreliable
    // in installed PWAs where SW interception can cause false negatives.
    let cancelled = false;
    const ping = async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 5_000);
        await fetch("/favicon.ico", {
          method: "HEAD",
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(t);
        if (!cancelled) setOnline(true);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void ping();

    if (navigator.onLine) sync();
    const t = setInterval(() => {
      if (navigator.onLine) sync();
    }, 5_000);
    const pingId = setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onBrowserOnline);
      window.removeEventListener("offline", onBrowserOffline);
      window.removeEventListener("offline-queue:changed", onQueueChanged);
      clearInterval(t);
      clearInterval(pingId);
    };
  }, [refresh, sync]);

  return { online, pending, sync };
}
