import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, run: boolean, duration = 1400) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!run) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return val;
}

export function StatsCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVis(true), {
      threshold: 0.4,
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  const v = useCountUp(value, vis);
  return (
    <span ref={ref}>
      {v.toLocaleString("id-ID")}
      {suffix}
    </span>
  );
}
