import { useEffect, useRef, useState, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { CHALLENGE_HIGHLIGHT_MS, CHALLENGE_HIGHLIGHT_FADE_MS } from "@/lib/constants";
import { useAnnounce } from "@/components/live-announcer.hook";

type Challenge = { id: string; title?: string | null };
type Participation = {
  challenge_id: string;
  streak?: number | null;
  current_day?: number | null;
  status?: string;
};

export function useChallengeDeeplink({
  data,
  focus,
  focusChallenge,
  articleRefs,
}: {
  data: { challenges: Challenge[]; participations: Participation[] } | undefined;
  focus: "streak" | undefined;
  focusChallenge: string | undefined;
  articleRefs: RefObject<Record<string, HTMLElement | null>>;
}) {
  const navigate = useNavigate();
  const announce = useAnnounce();
  const [openLb, setOpenLb] = useState<string | null>(null);
  const [streakAutoChallenge, setStreakAutoChallenge] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [highlightFading, setHighlightFading] = useState(false);

  const flashHighlight = (id: string) => {
    setHighlightId(id);
    setHighlightFading(false);
    const ch = (data?.challenges ?? []).find((c) => c.id === id);
    if (ch?.title) announce(`Kartu challenge ${ch.title} disorot`);
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
      const el = articleRefs.current?.[focusChallenge];
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => clearTimeout(t);
  }, [focusChallenge, articleRefs]);

  useEffect(() => {
    if (focus !== "streak") return;
    if (!data) return;
    const parts = data.participations ?? [];
    const scrollToFirstUnjoined = () => {
      const joinedIds = new Set(parts.map((p) => p.challenge_id));
      const target = (data?.challenges ?? []).find((c) => !joinedIds.has(c.id));
      if (target) {
        articleRefs.current?.[target.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    const active = parts.filter((p) => !p.status || p.status === "active");
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
      articleRefs.current?.[top.challenge_id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      flashHighlight(top.challenge_id);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, data, navigate]);

  return {
    openLb,
    setOpenLb,
    streakAutoChallenge,
    highlightId,
    highlightFading,
  };
}
