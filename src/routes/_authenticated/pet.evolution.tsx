import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { celebrate } from "@/lib/confetti";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/pet/evolution")({ component: Page });

const STAGES = [
  {
    name: "Telur",
    xp: 0,
    color: "#FFE0B2",
    body: (c: string) => (
      <ellipse cx="60" cy="65" rx="32" ry="40" fill={c} stroke="#8D6E63" strokeWidth="2" />
    ),
  },
  {
    name: "Tukik",
    xp: 100,
    color: "#FFD54F",
    body: (c: string) => (
      <g>
        <circle cx="60" cy="70" r="28" fill={c} />
        <circle cx="52" cy="62" r="3" fill="#222" />
        <circle cx="68" cy="62" r="3" fill="#222" />
        <polygon points="58,72 62,72 60,78" fill="#FF7043" />
      </g>
    ),
  },
  {
    name: "Anak",
    xp: 300,
    color: "#FFB74D",
    body: (c: string) => (
      <g>
        <ellipse cx="60" cy="75" rx="30" ry="25" fill={c} />
        <circle cx="60" cy="45" r="22" fill={c} />
        <circle cx="52" cy="42" r="3" fill="#222" />
        <circle cx="68" cy="42" r="3" fill="#222" />
        <polygon points="56,50 64,50 60,58" fill="#FF7043" />
      </g>
    ),
  },
  {
    name: "Remaja",
    xp: 700,
    color: "#FF8A65",
    body: (c: string) => (
      <g>
        <ellipse cx="60" cy="80" rx="34" ry="22" fill={c} />
        <circle cx="60" cy="40" r="24" fill={c} />
        <circle cx="50" cy="36" r="3.5" fill="#222" />
        <circle cx="70" cy="36" r="3.5" fill="#222" />
        <polygon points="54,44 66,44 60,54" fill="#E64A19" />
        <path d="M30 75 Q22 70 28 60" fill={c} />
        <path d="M90 75 Q98 70 92 60" fill={c} />
      </g>
    ),
  },
  {
    name: "Dewasa",
    xp: 1500,
    color: "#8D6E63",
    body: (c: string) => (
      <g>
        <ellipse cx="60" cy="78" rx="38" ry="24" fill={c} />
        <circle cx="60" cy="38" r="26" fill={c} />
        <circle cx="48" cy="34" r="4" fill="#fff" />
        <circle cx="72" cy="34" r="4" fill="#fff" />
        <circle cx="48" cy="34" r="2" fill="#222" />
        <circle cx="72" cy="34" r="2" fill="#222" />
        <polygon points="52,42 68,42 60,56" fill="#FFC107" />
        <path d="M22 80 Q10 65 22 50 L30 70 Z" fill={c} />
        <path d="M98 80 Q110 65 98 50 L90 70 Z" fill={c} />
      </g>
    ),
  },
];

function Page() {
  const [s, setS] = useState(0);
  const { t } = useTranslation();
  const stage = STAGES[s];
  const next = STAGES[s + 1];
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title={t("pet.evolution.title")} showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-6 text-center">
        <motion.div
          key={s}
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          className="mx-auto w-48 h-48 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 grid place-items-center"
        >
          <svg viewBox="0 0 120 120" className="w-36 h-36 drop-shadow">
            {stage.body(stage.color)}
          </svg>
        </motion.div>
        <div>
          <p className="text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {stage.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("pet.evolution.stageProgress", { n: s + 1, total: STAGES.length, xp: stage.xp })}
          </p>
        </div>
        <div className="flex gap-1.5 justify-center">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i <= s ? "w-8 bg-primary" : "w-4 bg-muted"}`}
            />
          ))}
        </div>
        {next ? (
          <p className="text-xs text-muted-foreground">
            {t("pet.evolution.xpNeeded", { xp: next.xp - stage.xp, name: next.name })}
          </p>
        ) : (
          <p className="text-xs text-primary font-semibold">{t("pet.evolution.peakForm")}</p>
        )}
        <button
          onClick={() => {
            const nxt = (s + 1) % STAGES.length;
            setS(nxt);
            if (nxt > 0) celebrate({ intense: nxt === STAGES.length - 1 });
          }}
          className="rounded-2xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold shadow active:scale-[0.98] transition"
        >
          {next ? t("pet.evolution.evolveBtn") : t("pet.evolution.restartBtn")}
        </button>
      </main>
      <BottomNav />
    </div>
  );
}
