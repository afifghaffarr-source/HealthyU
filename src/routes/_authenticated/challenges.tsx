import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { EmptyState } from "@/components/healthyu/empty-state";
import { ListSkeleton } from "@/components/healthyu/skeletons";
import { toast } from "sonner";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { BottomNav } from "@/components/bottom-nav";
import {
  listChallenges,
  joinChallenge,
  logChallengeDay,
  leaveChallenge,
} from "@/features/challenges/lib/challenges.functions";
import {
  CHALLENGE_HIGHLIGHT_MS,
  CHALLENGE_HIGHLIGHT_FADE_MS,
} from "@/lib/constants";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useAnnounce } from "@/components/live-announcer";
import { ChallengeCard } from "@/features/challenges/components/ChallengeCard";

const challengesSearchSchema = z.object({
  group: fallback(z.string().uuid().optional(), undefined),
  challenge: fallback(z.string().uuid().optional(), undefined),
  focus: fallback(z.enum(["streak"]).optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/challenges")({
  validateSearch: zodValidator(challengesSearchSchema),
  component: ChallengesPage,
});

function ChallengesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const announce = useAnnounce();
  const { group: focusGroup, challenge: focusChallenge, focus } = Route.useSearch();
  // prefers-reduced-motion → override transisi spring jadi 0ms.
  const prefersReducedMotion = useReducedMotion();
  const fetchAll = useServerFn(listChallenges);
  const joinFn = useServerFn(joinChallenge);
  const logFn = useServerFn(logChallengeDay);
  const leaveFn = useServerFn(leaveChallenge);

  const { data, isLoading } = useQuery({
    queryKey: ["challenges"],
    queryFn: () => fetchAll(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["challenges"] });

  const joinM = useMutation({
    mutationFn: (challenge_id: string) => joinFn({ data: { challenge_id } }),
    onSuccess: (r, challenge_id) => {
      toast.success(r.already ? "Sudah bergabung" : "Bergabung challenge!");
      const ch = (data?.challenges ?? []).find((c) => c.id === challenge_id);
      announce(
        r.already
          ? `Sudah bergabung challenge ${ch?.title ?? ""}`
          : `Bergabung challenge ${ch?.title ?? ""}`,
      );
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logM = useMutation({
    mutationFn: (p: { participant_id: string; day_number: number }) => logFn({ data: p }),
    onSuccess: (r) => {
      toast.success(`Hari ${r.day} tercatat · streak ${r.streak}`);
      announce(`Hari ${r.day} tercatat, streak ${r.streak}`);
      import("@/lib/confetti").then((m) => {
        const intense =
          (r as { completed?: boolean }).completed === true || (r.streak && r.streak % 7 === 0);
        m.celebrate({ intense: Boolean(intense) });
      });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const leaveM = useMutation({
    mutationFn: (participant_id: string) => leaveFn({ data: { participant_id } }),
    onSuccess: () => {
      toast.success("Keluar dari challenge");
      announce("Keluar dari challenge");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const challenges = data?.challenges ?? [];
  const partsByCh = new Map((data?.participations ?? []).map((p) => [p.challenge_id, p] as const));
  const [openLb, setOpenLb] = useState<string | null>(null);
  const [streakAutoChallenge, setStreakAutoChallenge] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [highlightFading, setHighlightFading] = useState(false);
  const articleRefs = useRef<Record<string, HTMLElement | null>>({});
  const flashHighlight = (id: string) => {
    setHighlightId(id);
    setHighlightFading(false);
    const ch = (data?.challenges ?? []).find((c) => c.id === id);
    if (ch?.title) announce(`Kartu challenge ${ch.title} disorot`);
    // Start fade-out 500ms before the end so the ring smoothly disappears.
    window.setTimeout(
      () => setHighlightFading(true),
      Math.max(0, CHALLENGE_HIGHLIGHT_MS - CHALLENGE_HIGHLIGHT_FADE_MS),
    );
    window.setTimeout(() => {
      setHighlightId((cur) => (cur === id ? null : cur));
      setHighlightFading(false);
    }, CHALLENGE_HIGHLIGHT_MS);
  };

  useEffect(() => {
    if (!focusChallenge) return;
    setOpenLb(focusChallenge);
    const t = setTimeout(() => {
      const el = articleRefs.current[focusChallenge];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [focusChallenge]);

  // Streak deeplink: scroll to challenge where user has the longest streak
  useEffect(() => {
    if (focus !== "streak") return;
    const parts = data?.participations ?? [];
    if (!data) return; // wait for data
    const scrollToFirstUnjoined = () => {
      const joinedIds = new Set(parts.map((p) => p.challenge_id));
      const target = (data?.challenges ?? []).find((c) => !joinedIds.has(c.id));
      if (target) {
        articleRefs.current[target.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
        flashHighlight(target.id);
      }
    };
    if (parts.length === 0) {
      toast.info("Belum ada streak — gabung challenge dulu", {
        action: { label: "Lihat challenge", onClick: scrollToFirstUnjoined },
      });
      navigate({ to: "/challenges", search: {}, replace: true });
      return;
    }
    const active = parts.filter((p) => {
      const s = (p as { status?: string }).status;
      return !s || s === "active";
    });
    if (active.length === 0) {
      toast.info("Semua streak sudah selesai — mulai challenge baru", {
        action: { label: "Lihat challenge", onClick: scrollToFirstUnjoined },
      });
      navigate({ to: "/challenges", search: {}, replace: true });
      return;
    }
    const top = active.slice().sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))[0];
    if (!top?.challenge_id) return;
    setOpenLb(top.challenge_id);
    setStreakAutoChallenge(top.challenge_id);
    const t = setTimeout(() => {
      articleRefs.current[top.challenge_id]?.scrollIntoView({ behavior: "smooth", block: "start" });
      flashHighlight(top.challenge_id);
    }, 250);
    return () => clearTimeout(t);
  }, [focus, data, navigate]);

  return (
    <div className="min-h-dvh pb-32">
      <div className="max-w-md mx-auto px-4">
        <TopAppBar title="Challenges" showBack />
      </div>

      <main className="max-w-md mx-auto px-4 pt-4 space-y-3">
        {isLoading && <ListSkeleton count={3} />}
        {!isLoading &&
          (() => {
            const allParts = data?.participations ?? [];
            const active = allParts.filter(
              (p) => (p as { status?: string }).status !== "completed",
            );
            if (active.length === 0) return null;
            const top = active.slice().sort((a, b) => (b.streak ?? 0) - (a.streak ?? 0))[0];
            const ch = challenges.find((c) => c.id === top?.challenge_id);
            if (!ch) return null;
            return (
              <button
                onClick={() =>
                  articleRefs.current[ch.id]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className="sticky top-2 z-20 w-full bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-2xl px-4 py-3 shadow-lg shadow-primary/20 flex items-center gap-3 animate-fade-up"
              >
                <Trophy className="size-5 shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    Lanjutkan tantangan
                  </p>
                  <p className="text-sm font-semibold truncate">
                    {ch.title} · streak {top.streak ?? 0}
                  </p>
                </div>
                <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                  Hari {(top.current_day ?? 0) + 1}
                </span>
              </button>
            );
          })()}
        {!isLoading && challenges.length === 0 && (
          <EmptyState
            icon={Trophy}
            title="Belum ada challenge"
            description="Challenge baru akan dirilis berkala."
          />
        )}
        {challenges.map((c) => {
          const part = partsByCh.get(c.id);
          return (
            <ChallengeCard
              key={c.id}
              ref={(el) => {
                articleRefs.current[c.id] = el;
              }}
              c={c}
              part={part}
              highlighted={highlightId === c.id}
              highlightFading={highlightFading}
              prefersReducedMotion={prefersReducedMotion}
              openLeaderboard={openLb === c.id}
              focusGroup={focusChallenge === c.id ? focusGroup : undefined}
              autoSelectFirstGroup={streakAutoChallenge === c.id}
              initialOpenExtras={focusChallenge === c.id}
              joining={joinM.isPending}
              logging={logM.isPending}
              onJoin={() => joinM.mutate(c.id)}
              onLog={(participant_id, day_number) =>
                logM.mutate({ participant_id, day_number })
              }
              onLeave={(participant_id) => leaveM.mutate(participant_id)}
              onToggleLeaderboard={() => setOpenLb(openLb === c.id ? null : c.id)}
            />
          );
        })}
      </main>

      <BottomNav />
    </div>
  );
}
