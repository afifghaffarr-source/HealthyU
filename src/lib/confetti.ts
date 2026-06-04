import confetti from "canvas-confetti";

export function celebrate(opts?: { intense?: boolean }) {
  if (typeof window === "undefined") return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;
  const count = opts?.intense ? 160 : 80;
  confetti({
    particleCount: count,
    spread: 75,
    origin: { y: 0.7 },
    colors: ["#f59e0b", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6"],
    scalar: 0.9,
  });
  if (opts?.intense) {
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 } });
    }, 200);
  }
}