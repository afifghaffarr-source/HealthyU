import { forwardRef } from "react";
import { Calendar, Check, Flame, Medal, Users } from "lucide-react";
import { Leaderboard } from "./Leaderboard";
import { GroupInviter } from "./GroupInviter";
import { BonusClaimer } from "./BonusClaimer";
import {
  CHALLENGE_HIGHLIGHT_FADE_OPACITY,
  CHALLENGE_HIGHLIGHT_TRANSITION_MS,
} from "@/lib/constants";

type Challenge = {
  id: string;
  title: string;
  description?: string | null;
  duration_days?: number | null;
  difficulty?: string | null;
  current_participants?: number | null;
  xp_reward?: number | null;
  coin_reward?: number | null;
  is_featured?: boolean | null;
};

type Participation = {
  id: string;
  streak?: number | null;
  current_day?: number | null;
};

export const ChallengeCard = forwardRef<
  HTMLElement,
  {
    c: Challenge;
    part: Participation | undefined;
    highlighted: boolean;
    highlightFading: boolean;
    prefersReducedMotion: boolean;
    openLeaderboard: boolean;
    focusGroup?: string;
    autoSelectFirstGroup: boolean;
    initialOpenExtras: boolean;
    onJoin: () => void;
    onLog: (participantId: string, dayNumber: number) => void;
    onLeave: (participantId: string) => void;
    onToggleLeaderboard: () => void;
    joining: boolean;
    logging: boolean;
  }
>(function ChallengeCard(
  {
    c,
    part,
    highlighted,
    highlightFading,
    prefersReducedMotion,
    openLeaderboard,
    focusGroup,
    autoSelectFirstGroup,
    initialOpenExtras,
    onJoin,
    onLog,
    onLeave,
    onToggleLeaderboard,
    joining,
    logging,
  },
  ref,
) {
  const joined = !!part;
  const nextDay = (part?.current_day ?? 0) + 1;
  return (
    <article
      ref={ref}
      className={
        highlighted
          ? `rounded-3xl bg-card outline-1 outline-black/5 p-4 shadow-sm ring-4 ring-primary/40 transition-[opacity,box-shadow] ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none motion-reduce:!ring-[var(--ring-strong)] motion-reduce:!opacity-100 ${
              highlightFading ? "ring-primary/0" : "animate-pulse motion-reduce:animate-none"
            }`
          : "rounded-3xl bg-card outline-1 outline-black/5 p-4 shadow-sm"
      }
      style={
        highlighted
          ? {
              transitionDuration: prefersReducedMotion
                ? "0ms"
                : `${CHALLENGE_HIGHLIGHT_TRANSITION_MS}ms`,
              ...(highlightFading ? { opacity: CHALLENGE_HIGHLIGHT_FADE_OPACITY } : null),
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold leading-tight truncate">{c.title}</h2>
          {c.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
          )}
        </div>
        {c.is_featured && (
          <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
            Featured
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mt-3">
        {c.duration_days && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" />
            {c.duration_days} hari
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" />
          {c.current_participants ?? 0}
        </span>
        {c.difficulty && <span className="capitalize">{c.difficulty}</span>}
        {(c.xp_reward ?? 0) > 0 && (
          <span className="text-primary font-semibold">+{c.xp_reward} XP</span>
        )}
        {(c.coin_reward ?? 0) > 0 && (
          <span className="text-amber-600 font-semibold">+{c.coin_reward} 🪙</span>
        )}
      </div>

      {joined && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold">
            <Flame className="size-3 text-orange-500" />
            Streak {part!.streak ?? 0}
          </span>
          <span className="text-muted-foreground">
            Hari {part!.current_day ?? 0}
            {c.duration_days ? ` / ${c.duration_days}` : ""}
          </span>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!joined ? (
          <button
            onClick={onJoin}
            disabled={joining}
            className="flex-1 h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            Gabung
          </button>
        ) : (
          <>
            <button
              onClick={() => onLog(part!.id, nextDay)}
              disabled={logging}
              className="flex-1 h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <Check className="size-4" />
              Catat hari {nextDay}
            </button>
            <button
              onClick={() => {
                if (confirm("Keluar dari challenge ini?")) onLeave(part!.id);
              }}
              className="h-10 px-3 rounded-2xl bg-muted text-foreground text-sm"
            >
              Keluar
            </button>
          </>
        )}
      </div>

      <button
        onClick={onToggleLeaderboard}
        className="mt-3 w-full text-[11px] font-semibold text-primary inline-flex items-center justify-center gap-1"
      >
        <Medal className="size-3" />
        {openLeaderboard ? "Sembunyikan leaderboard" : "Lihat leaderboard"}
      </button>
      {openLeaderboard && (
        <Leaderboard
          challengeId={c.id}
          initialGroup={focusGroup}
          autoSelectFirstGroup={autoSelectFirstGroup}
        />
      )}
      {joined && <GroupInviter challengeId={c.id} initialOpen={initialOpenExtras} />}
      {joined && <BonusClaimer challengeId={c.id} initialOpen={initialOpenExtras} />}
    </article>
  );
});
