// Lightweight DOM confetti — no deps, respects prefers-reduced-motion
export function fireConfetti(opts: { count?: number; origin?: { x: number; y: number } } = {}) {
  if (typeof window === "undefined") return;
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (mq?.matches) return;
  const count = opts.count ?? 50;
  const { x = window.innerWidth / 2, y = window.innerHeight / 3 } = opts.origin ?? {};
  const colors = ["#4CAF50", "#FF9800", "#2196F3", "#E91E63", "#FFEB3B"];
  const root = document.createElement("div");
  root.style.cssText = `position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden`;
  document.body.appendChild(root);
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 220;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist + 200;
    const size = 6 + Math.random() * 6;
    s.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};transform:translate(-50%,-50%);transition:transform 1100ms cubic-bezier(.2,.7,.3,1),opacity 1100ms ease-out;opacity:1`;
    root.appendChild(s);
    requestAnimationFrame(() => {
      s.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 720}deg)`;
      s.style.opacity = "0";
    });
  }
  setTimeout(() => root.remove(), 1300);
}

// Convenience wrapper used across pages
export function celebrate(opts: { intense?: boolean } = {}) {
  fireConfetti({ count: opts.intense ? 120 : 50 });
}