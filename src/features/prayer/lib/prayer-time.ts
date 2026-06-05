import { useEffect, useState } from "react";

export function findNext(prayers: Array<{ name: string; time: string }>): number {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < prayers.length; i++) {
    const [h, m] = prayers[i].time.split(":").map(Number);
    if (h * 60 + m > cur) return i;
  }
  return 0;
}

export function shiftMinutes(time: string, delta: number): string {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m + delta;
  total = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function useCountdown(time?: string): string | null {
  const [, force] = useState(0);
  useEffect(() => {
    if (!time) return;
    const id = setInterval(() => force((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [time]);
  if (!time) return null;
  const now = new Date();
  const [h, m] = time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const diff = Math.max(0, target.getTime() - now.getTime());
  const hh = Math.floor(diff / 3_600_000);
  const mm = Math.floor((diff % 3_600_000) / 60_000);
  const ss = Math.floor((diff % 60_000) / 1000);
  return `${hh}j ${mm}m ${ss}d`;
}