import { useEffect, useState } from "react";

export function useFastClock(
  fast: { start_time: string; target_hours: number | string } | null | undefined,
) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!fast) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [fast]);
  const fastMs = fast ? now - new Date(fast.start_time).getTime() : 0;
  const fastHrs = fastMs / 3600000;
  const fastPct = fast ? Math.min(100, (fastHrs / Number(fast.target_hours)) * 100) : 0;
  return { fastMs, fastHrs, fastPct };
}
