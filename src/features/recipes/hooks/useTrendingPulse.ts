import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  TRENDING_TTL_DAYS,
  TRENDING_COUNTER_PULSE_MS,
  TRENDING_GROWTH_FLASH_MS,
} from "@/lib/constants";

type RecipeLike = { id: string; weekly_growth?: number | string | null };

function readStoredTrendingCount(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("recipes:trendingCount");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { count: number; ts: number };
    if (
      typeof parsed?.count !== "number" ||
      typeof parsed?.ts !== "number" ||
      Date.now() - parsed.ts > TRENDING_TTL_DAYS * 86400000
    ) {
      window.localStorage.removeItem("recipes:trendingCount");
      return null;
    }
    return parsed.count;
  } catch {
    window.localStorage.removeItem("recipes:trendingCount");
    return null;
  }
}

export function useTrendingPulse(all: RecipeLike[], sort: string) {
  const qc = useQueryClient();
  const [pulseTrending, setPulseTrending] = useState(false);
  const [pulseCounter, setPulseCounter] = useState(false);
  const [flashIds, setFlashIds] = useState<Record<string, number>>({});
  const prevGrowth = useRef<Record<string, number>>({});
  const prevTrendingCount = useRef<number | null>(readStoredTrendingCount());

  const trendingCount = all.filter((r) => Number(r.weekly_growth ?? 0) > 0).length;

  useEffect(() => {
    const prev = prevTrendingCount.current;
    prevTrendingCount.current = trendingCount;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "recipes:trendingCount",
        JSON.stringify({ count: trendingCount, ts: Date.now() }),
      );
    }
    if (prev === null) return;
    if (trendingCount > prev) {
      setPulseCounter(true);
      const t = window.setTimeout(() => setPulseCounter(false), TRENDING_COUNTER_PULSE_MS);
      return () => window.clearTimeout(t);
    }
  }, [trendingCount]);

  useEffect(() => {
    if (sort !== "trending") return;
    const ch = supabase
      .channel("recipes-trending-bookmarks")
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_bookmarks" }, () => {
        qc.invalidateQueries({ queryKey: ["recipes"] });
        setPulseTrending(true);
        window.setTimeout(() => setPulseTrending(false), 3000);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [sort, qc]);

  useEffect(() => {
    const next: Record<string, number> = {};
    const bumps: Record<string, number> = {};
    for (const r of all) {
      const g = Number(r.weekly_growth ?? 0);
      next[r.id] = g;
      const prev = prevGrowth.current[r.id];
      if (prev !== undefined && g > prev) bumps[r.id] = g - prev;
    }
    prevGrowth.current = next;
    if (Object.keys(bumps).length === 0) return;
    setFlashIds((cur) => ({ ...cur, ...bumps }));
    const ids = Object.keys(bumps);
    const t = window.setTimeout(() => {
      setFlashIds((cur) => {
        const copy = { ...cur };
        for (const id of ids) delete copy[id];
        return copy;
      });
    }, TRENDING_GROWTH_FLASH_MS);
    return () => window.clearTimeout(t);
  }, [all]);

  const resetCounter = () => {
    prevTrendingCount.current = trendingCount;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "recipes:trendingCount",
        JSON.stringify({ count: trendingCount, ts: Date.now() }),
      );
    }
    setPulseCounter(false);
  };

  return { trendingCount, pulseTrending, pulseCounter, flashIds, resetCounter };
}
