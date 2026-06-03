import { useEffect, useState, useCallback } from "react";
import { count, flush } from "@/lib/offline-queue";
import { logWater } from "@/lib/water.functions";
import { logWeight } from "@/lib/weight.functions";
import { logMeal } from "@/lib/meals.functions";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";

export function useOfflineQueue() {
  const qc = useQueryClient();
  const water = useServerFn(logWater);
  const weight = useServerFn(logWeight);
  const meal = useServerFn(logMeal);
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
        await weight({ data: it.payload as { weight_kg: number; note?: string | null } });
      },
      meal: async (it) => {
        await meal({ data: it.payload as Parameters<typeof meal>[0]["data"] });
      },
    });
    if (res.synced > 0) {
      qc.invalidateQueries();
    }
    await refresh();
    return res;
  }, [water, weight, meal, qc, refresh]);

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
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("offline-queue:changed", ch);
    };
  }, [refresh, sync]);

  return { online, pending, sync };
}