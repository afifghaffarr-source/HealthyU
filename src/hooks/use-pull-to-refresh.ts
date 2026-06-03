import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(onRefresh: () => Promise<unknown> | unknown) {
  const startY = useRef<number | null>(null);
  const [pulling, setPulling] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && window.scrollY <= 0) {
        setPulling(Math.min(80, dy * 0.5));
      }
    };
    const onTouchEnd = async () => {
      if (pulling >= 60 && !refreshing) {
        setRefreshing(true);
        try { await onRefresh(); } finally {
          setRefreshing(false);
        }
      }
      setPulling(0);
      startY.current = null;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pulling, refreshing, onRefresh]);

  return { pulling, refreshing };
}