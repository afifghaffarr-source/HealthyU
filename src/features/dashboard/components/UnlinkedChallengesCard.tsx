import { Link } from "@tanstack/react-router";
import { Trophy, ArrowRight } from "lucide-react";
import type { myUnlinkedJoinedChallenges } from "@/features/challenges/lib/myUnlinkedChallenges.functions";

type UnlinkedChallenge = Awaited<ReturnType<typeof myUnlinkedJoinedChallenges>>[number];

export function UnlinkedChallengesCard({ challenges }: { challenges: UnlinkedChallenge[] }) {
  if (challenges.length === 0) return null;
  return (
    <div className="bg-card p-4 rounded-3xl outline-1 outline-primary/20 shadow-sm animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="size-4 text-primary" />
        <p className="text-xs font-bold uppercase tracking-wider">Ajak grup ikut challenge</p>
      </div>
      <div className="space-y-1.5">
        {challenges.slice(0, 3).map((c) => (
          <Link
            key={c.id}
            to="/challenges"
            search={{ challenge: c.id }}
            className="flex items-center justify-between gap-2 bg-muted/40 hover:bg-muted/70 rounded-xl px-3 py-2 text-xs"
          >
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{c.title}</p>
              {(c.pending_members ?? 0) > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  {c.pending_members} anggota grup belum gabung
                </p>
              )}
              {(c.preview_members?.length ?? 0) > 0 && (
                <div className="flex items-center mt-1.5">
                  <div className="flex -space-x-1.5">
                    {c.preview_members!.map((m) => (
                      <span
                        key={m.id}
                        title={m.name}
                        className="size-5 rounded-full bg-primary/15 outline-2 outline-card grid place-items-center text-[9px] font-bold text-primary overflow-hidden"
                      >
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt={m.name} className="size-full object-cover" />
                        ) : (
                          (m.name ?? "?").slice(0, 1).toUpperCase()
                        )}
                      </span>
                    ))}
                  </div>
                  {(c.pending_members ?? 0) > (c.preview_members?.length ?? 0) && (
                    <span className="text-[9px] text-muted-foreground ml-1.5">
                      +{(c.pending_members ?? 0) - (c.preview_members?.length ?? 0)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-[10px] text-primary font-semibold inline-flex items-center gap-1 shrink-0">
              Undang <ArrowRight className="size-3" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
