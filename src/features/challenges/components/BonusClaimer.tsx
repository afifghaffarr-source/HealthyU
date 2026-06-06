import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMiniFocusTrap } from "@/hooks/useMiniFocusTrap";
import { listChallengeGroups } from "@/features/challenges/lib/groupChallenges.functions";
import {
  claimGroupChallengeBonus,
  listGroupBonusClaimers,
  listGroupBonusStatus,
} from "@/features/challenges/lib/groupChallengeBonus.functions";

export function BonusClaimer({
  challengeId,
  initialOpen,
}: {
  challengeId: string;
  initialOpen?: boolean;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(initialOpen ?? true);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  useMiniFocusTrap(open, [triggerRef], () => {
    setOpen(false);
    triggerRef.current?.focus();
  });
  const fetchGroups = useServerFn(listChallengeGroups);
  const fetchClaimed = useServerFn(listGroupBonusStatus);
  const claimFn = useServerFn(claimGroupChallengeBonus);
  const { data: groups = [] } = useQuery({
    queryKey: ["challenge-groups", challengeId],
    queryFn: () => fetchGroups({ data: { challenge_id: challengeId } }),
  });
  const { data: claimedIds = [] } = useQuery({
    queryKey: ["bonus-claimed", challengeId],
    queryFn: () => fetchClaimed({ data: { challenge_id: challengeId } }),
  });
  useEffect(() => {
    if (groups.length === 0) return;
    const groupIds = groups.map((g) => g.id);
    const ch = supabase
      .channel(`bonus-claimer-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_challenge_bonuses",
          filter: `challenge_id=eq.${challengeId}`,
        },
        (payload) => {
          const row = payload.new as { group_id?: string };
          if (row.group_id && groupIds.includes(row.group_id)) {
            qc.invalidateQueries({ queryKey: ["bonus-claimed", challengeId] });
            qc.invalidateQueries({ queryKey: ["bonus-claimers", row.group_id, challengeId] });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [challengeId, groups, qc]);
  const claimedSet = new Set(claimedIds);
  const claimM = useMutation({
    mutationFn: (group_id: string) => claimFn({ data: { group_id, challenge_id: challengeId } }),
    onSuccess: (r, group_id) => {
      if (r.ok) {
        toast.success(`+${r.coins_awarded} 🪙 bonus grup!`);
        qc.invalidateQueries({ queryKey: ["bonus-claimed", challengeId] });
        qc.invalidateQueries({ queryKey: ["bonus-claimers"] });
      } else if (r.reason === "not_all_completed") {
        toast.error(`Belum semua selesai (${r.completed}/${r.total})`);
      } else if (r.reason === "already_claimed") {
        toast.info("Sudah pernah klaim");
      } else {
        toast.error(`Gagal: ${r.reason ?? "unknown"}`);
      }
      void group_id;
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (groups.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-[11px] font-semibold text-muted-foreground inline-flex items-center justify-center gap-1"
      >
        <Gift className="size-3" />
        {open ? "Tutup klaim bonus" : "Klaim bonus grup"}
      </button>
      {open &&
        groups.map((g) => {
          const done = claimedSet.has(g.id);
          return (
            <div key={g.id} className="space-y-1">
              <button
                onClick={() => !done && claimM.mutate(g.id)}
                disabled={done || claimM.isPending}
                className={`w-full text-[11px] font-semibold rounded-xl py-1.5 px-2 inline-flex items-center justify-center gap-1 ${
                  done ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-800"
                }`}
              >
                <Gift className="size-3" />
                {done ? `Bonus "${g.name}" terklaim` : `Klaim bonus grup "${g.name}"`}
              </button>
              <BonusClaimers groupId={g.id} challengeId={challengeId} groupName={g.name} />
            </div>
          );
        })}
    </div>
  );
}

function BonusClaimers({
  groupId,
  challengeId,
  groupName,
}: {
  groupId: string;
  challengeId: string;
  groupName: string;
}) {
  const qc = useQueryClient();
  const fetchClaimers = useServerFn(listGroupBonusClaimers);
  const { data: claimers = [] } = useQuery({
    queryKey: ["bonus-claimers", groupId, challengeId],
    queryFn: () => fetchClaimers({ data: { group_id: groupId, challenge_id: challengeId } }),
  });
  useEffect(() => {
    const ch = supabase
      .channel(`bonus-${groupId}-${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_challenge_bonuses",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const row = payload.new as { challenge_id?: string };
          if (row.challenge_id === challengeId) {
            qc.invalidateQueries({ queryKey: ["bonus-claimers", groupId, challengeId] });
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [groupId, challengeId, qc]);
  if (claimers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 px-1">
      <span className="text-[10px] text-muted-foreground">Sudah klaim di {groupName}:</span>
      {claimers.map((c) => (
        <span
          key={c.user_id}
          title={`+${c.coins} 🪙`}
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 rounded-full px-1.5 py-0.5"
        >
          🪙 {c.name.split(" ")[0]}
        </span>
      ))}
    </div>
  );
}
