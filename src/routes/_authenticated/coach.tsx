import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { dailyCoach, eveningCoach, getCoachHistory } from "@/features/coach/lib/coach.functions";
import { MedicalDisclaimer } from "@/components/healthyu/MedicalDisclaimer";
import { BottomNav } from "@/components/bottom-nav";
import {
  Sparkles,
  Loader2,
  Sun,
  Target,
  Lightbulb,
  AlertTriangle,
  RefreshCw,
  Moon,
  Trophy,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { ActionPlanCard } from "@/features/coach/components/ActionPlanCard";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/coach")({
  component: CoachPage,
});

const TABS = [
  { id: "morning" as const, label: "Pagi", Icon: Sun },
  { id: "evening" as const, label: "Malam", Icon: Moon },
];

function CoachPage() {
  const qc = useQueryClient();
  const dailyFn = useServerFn(dailyCoach);
  const eveningFn = useServerFn(eveningCoach);
  const historyFn = useServerFn(getCoachHistory);
  const [tab, setTab] = useState<"morning" | "evening">("morning");
  const [showHistory, setShowHistory] = useState(false);

  const dailyMut = useMutation({
    mutationFn: () => dailyFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach"] }),
    onError: (e: Error) => toast.error(e.message || "Gagal generate coach"),
  });
  const eveningMut = useMutation({
    mutationFn: () => eveningFn(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coach"] }),
    onError: (e: Error) => toast.error(e.message || "Gagal generate coach"),
  });

  // Generate on first mount (morning)
  useEffect(() => {
    dailyMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (newTab: "morning" | "evening") => {
    setTab(newTab);
    if (newTab === "morning" && !dailyMut.data) dailyMut.mutate();
    if (newTab === "evening" && !eveningMut.data) eveningMut.mutate();
  };

  const handleRefresh = () => {
    if (tab === "morning") dailyMut.mutate();
    else eveningMut.mutate();
  };

  const currentData = tab === "morning" ? dailyMut.data : eveningMut.data;
  const currentIsPending = tab === "morning" ? dailyMut.isPending : eveningMut.isPending;
  const currentError = tab === "morning" ? dailyMut.error : eveningMut.error;

  const { data: history = [] } = useQuery({
    queryKey: ["coach", "history"],
    queryFn: () => historyFn(),
    enabled: showHistory,
  });

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar
          title="AI Coach"
          subtitle="Personalisasi dari data 7 hari kamu"
          showBack
          action={
            <button
              onClick={handleRefresh}
              disabled={currentIsPending}
              className="size-9 rounded-full bg-muted grid place-items-center disabled:opacity-50"
              aria-label="Refresh coach"
            >
              {currentIsPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </button>
          }
        />

        {/* Tabs: Morning / Evening */}
        <div className="grid grid-cols-2 gap-2 bg-card p-1 rounded-2xl outline-1 outline-black/5">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTabChange(id)}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                tab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {/* Medical safety disclaimer — AI Coach provides general guidance, not medical advice. */}
        <MedicalDisclaimer variant="disclaimer" className="w-full" />

        {/* Loading state */}
        {currentIsPending && !currentData && (
          <div className="bg-card p-8 rounded-3xl outline-1 outline-black/5 text-center space-y-3">
            <Loader2 className="size-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              {tab === "morning"
                ? "AI sedang menganalisis data Anda..."
                : "AI sedang menyiapkan refleksi malam..."}
            </p>
          </div>
        )}

        {/* Error state */}
        {currentError && !currentData && (
          <div className="bg-destructive/10 p-5 rounded-3xl text-sm text-destructive">
            {currentError instanceof Error ? currentError.message : "Gagal memuat coach"}
          </div>
        )}

        {/* MORNING COACH UI */}
        {tab === "morning" && currentData && "focus" in currentData && (
          <MorningView data={currentData} loading={currentIsPending} />
        )}

        {/* EVENING COACH UI */}
        {tab === "evening" && currentData && "reflection" in currentData && (
          <EveningView data={currentData} loading={currentIsPending} />
        )}

        {/* HISTORY */}
        <section>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition text-sm font-medium"
          >
            <span className="inline-flex items-center gap-2">
              <TrendingUp className="size-4 text-muted-foreground" />
              Riwayat Coach (7 hari)
            </span>
            <ArrowRight
              className={`size-4 transition-transform ${showHistory ? "rotate-90" : ""}`}
            />
          </button>
          {showHistory && history.length > 0 && (
            <div className="mt-3 space-y-2">
              {history.map(
                (h: {
                  id: string;
                  kind: string;
                  session_date: string;
                  focus: string | null;
                  summary: string | null;
                  tips: string[] | null;
                  warnings: string[] | null;
                  read_at: string | null;
                }) => (
                  <HistoryRow key={h.id} item={h} />
                ),
              )}
            </div>
          )}
          {showHistory && history.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Belum ada riwayat coach.
            </p>
          )}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

// ─── Morning View ────────────────────────────────────────────────────────────

type MorningCoachView = {
  id?: string | null;
  greeting: string;
  focus: string;
  summary: string;
  tips: string[];
  warnings: string[];
  action_plan: Array<{
    action: string;
    label: string;
    target_value?: string;
    priority?: "low" | "medium" | "high";
  }>;
  generated_at: string;
  cached?: boolean;
};

type EveningCoachView = {
  id?: string | null;
  greeting: string;
  reflection: string;
  wins: string[];
  improvements: string[];
  tomorrow_focus: string;
  tips: string[];
  action_plan: Array<{
    action: string;
    label: string;
    target_value?: string;
    priority?: "low" | "medium" | "high";
  }>;
  generated_at: string;
  cached?: boolean;
};

function MorningView({ data, loading }: { data: MorningCoachView; loading: boolean }) {
  return (
    <>
      <section className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 p-6 rounded-3xl outline-1 outline-amber-200/40 dark:outline-amber-900/30 space-y-2 animate-fade-up">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Sun className="size-5" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider">Sapaan Pagi</span>
          {data.cached && (
            <span className="text-[10px] bg-white/50 dark:bg-black/30 px-1.5 py-0.5 rounded-full">
              cached
            </span>
          )}
        </div>
        <p className="text-lg font-bold leading-snug">{data.greeting}</p>
      </section>

      <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2 animate-fade-up">
        <div className="flex items-center gap-2 text-coral">
          <Target className="size-4" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider">Fokus Hari Ini</span>
        </div>
        <p className="text-sm font-semibold leading-relaxed">{data.focus}</p>
      </section>

      {data.summary && (
        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2 animate-fade-up">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ringkasan Minggu Lalu
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">{data.summary}</p>
        </section>
      )}

      {data.action_plan && data.action_plan.length > 0 && (
        <ActionPlanCard actions={data.action_plan} />
      )}

      {data.tips && data.tips.length > 0 && (
        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 text-sage-deep dark:text-sage">
            <Lightbulb className="size-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider">Tips Hari Ini</span>
          </div>
          <ul className="space-y-2">
            {data.tips.map((t: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.warnings && data.warnings.length > 0 && (
        <section className="bg-amber-500/10 p-5 rounded-3xl outline-1 outline-amber-500/20 space-y-2 animate-fade-up">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
            <AlertTriangle className="size-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider">Perhatian</span>
          </div>
          <ul className="space-y-1.5">
            {data.warnings.map((w: string, i: number) => (
              <li key={i} className="text-sm leading-relaxed">
                • {w}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Dibuat {new Date(data.generated_at).toLocaleString("id-ID")} • Bukan saran medis
      </p>
    </>
  );
}

// ─── Evening View ────────────────────────────────────────────────────────────

function EveningView({ data, loading }: { data: EveningCoachView; loading: boolean }) {
  return (
    <>
      <section className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/10 p-6 rounded-3xl outline-1 outline-indigo-200/40 dark:outline-indigo-900/30 space-y-2 animate-fade-up">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <Moon className="size-5" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-wider">Refleksi Malam</span>
          {data.cached && (
            <span className="text-[10px] bg-white/50 dark:bg-black/30 px-1.5 py-0.5 rounded-full">
              cached
            </span>
          )}
        </div>
        <p className="text-lg font-bold leading-snug">{data.greeting}</p>
        {data.reflection && (
          <p className="text-sm leading-relaxed text-foreground/80 mt-2">{data.reflection}</p>
        )}
      </section>

      {data.wins && data.wins.length > 0 && (
        <section className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-3xl outline-1 outline-emerald-200/40 dark:outline-emerald-900/30 space-y-3 animate-fade-up">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Trophy className="size-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider">Pencapaian Hari Ini</span>
          </div>
          <ul className="space-y-1.5">
            {data.wins.map((w: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0">✓</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.improvements && data.improvements.length > 0 && (
        <section className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-3xl outline-1 outline-amber-200/40 dark:outline-amber-900/30 space-y-2 animate-fade-up">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Lightbulb className="size-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider">Untuk Besok</span>
          </div>
          <ul className="space-y-1.5">
            {data.improvements.map((w: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="shrink-0">→</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.tomorrow_focus && (
        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2 animate-fade-up">
          <div className="flex items-center gap-2 text-coral">
            <Target className="size-4" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-wider">Fokus Besok</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed">{data.tomorrow_focus}</p>
        </section>
      )}

      {data.action_plan && data.action_plan.length > 0 && (
        <ActionPlanCard actions={data.action_plan} />
      )}

      {data.tips && data.tips.length > 0 && (
        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-2 animate-fade-up">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tips Malam Ini
          </h2>
          <ul className="space-y-1.5">
            {data.tips.map((t: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="text-primary font-bold shrink-0">•</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Dibuat {new Date(data.generated_at).toLocaleString("id-ID")} • Bukan saran medis
      </p>
    </>
  );
}

// ─── History Row ─────────────────────────────────────────────────────────────

type HistoryItem = {
  id: string;
  kind: string;
  session_date: string;
  focus: string | null;
  summary: string | null;
  tips: string[] | null;
  warnings: string[] | null;
  read_at: string | null;
};

function HistoryRow({ item }: { item: HistoryItem }) {
  const date = new Date(item.session_date).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const isEvening = item.kind === "evening";
  const Icon = isEvening ? Moon : Sun;

  return (
    <div className="bg-card p-3 rounded-xl outline-1 outline-black/5 flex items-start gap-3">
      <div
        className={`size-7 rounded-lg grid place-items-center shrink-0 ${
          isEvening
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        }`}
      >
        <Icon className="size-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isEvening ? "Malam" : "Pagi"} • {date}
          </p>
          {item.read_at ? (
            <span className="text-[9px] text-muted-foreground/60">✓ dibaca</span>
          ) : (
            <span className="text-[9px] text-coral">baru</span>
          )}
        </div>
        <p className="text-sm font-medium leading-snug mt-0.5 line-clamp-2">
          {item.focus || item.summary || "—"}
        </p>
      </div>
    </div>
  );
}
