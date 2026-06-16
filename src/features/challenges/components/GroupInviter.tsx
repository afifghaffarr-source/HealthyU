import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "@/lib/toast-config";
import { UserPlus } from "lucide-react";
import { useMiniFocusTrap } from "@/hooks/useMiniFocusTrap";
import {
  inviteGroupToChallenge,
  listMyGroupsForChallenge,
} from "@/features/challenges/lib/groupChallenges.functions";
import { groupChallengePendingMembers } from "@/features/challenges/lib/groupChallengePending.functions";

export function GroupInviter({
  challengeId,
  initialOpen,
}: {
  challengeId: string;
  initialOpen?: boolean;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchGroups = useServerFn(listMyGroupsForChallenge);
  const inviteFn = useServerFn(inviteGroupToChallenge);
  const [open, setOpen] = useState(!!initialOpen);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  useMiniFocusTrap(open, [toggleRef], () => {
    setOpen(false);
    toggleRef.current?.focus();
  });
  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["my-groups-for-challenge", challengeId],
    queryFn: () => fetchGroups({ data: { challenge_id: challengeId } }),
    enabled: open,
  });
  const inviteM = useMutation({
    mutationFn: async (group_id: string) => {
      await inviteFn({ data: { group_id, challenge_id: challengeId } });
      return group_id;
    },
    onSuccess: (group_id) => {
      toast.success("Grup diundang ke challenge");
      qc.invalidateQueries({ queryKey: ["my-groups-for-challenge", challengeId] });
      qc.invalidateQueries({ queryKey: ["challenge-groups", challengeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mt-2">
      <button
        ref={toggleRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full text-[11px] font-semibold text-muted-foreground inline-flex items-center justify-center gap-1"
      >
        <UserPlus className="size-3" />
        {open ? "Tutup" : "Bareng grup"}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {isLoading && <p className="text-[11px] text-muted-foreground text-center">Memuat…</p>}
          {!isLoading && groups.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              Belum ada grup. Buat di halaman Groups.
            </p>
          )}
          {groups.map((g) => (
            <GroupInviteRow
              key={g.id}
              group={g}
              challengeId={challengeId}
              onInvite={() => inviteM.mutate(g.id)}
              inviting={inviteM.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupInviteRow({
  group,
  challengeId,
  onInvite,
  inviting,
}: {
  group: { id: string; name: string; joined: boolean };
  challengeId: string;
  onInvite: () => void;
  inviting: boolean;
}) {
  const fetchPending = useServerFn(groupChallengePendingMembers);
  const { data: pending } = useQuery({
    queryKey: ["group-pending-members", group.id, challengeId],
    queryFn: () => fetchPending({ data: { group_id: group.id, challenge_id: challengeId } }),
  });
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-muted/40 text-xs">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{group.name}</p>
        {(pending?.preview.length ?? 0) > 0 && (
          <div className="flex items-center mt-1">
            <div className="flex -space-x-1.5">
              {pending!.preview.map((m) => (
                <span
                  key={m.id}
                  title={m.name}
                  className="size-5 rounded-full bg-primary/15 outline-2 outline-card grid place-items-center text-[9px] font-bold text-primary overflow-hidden"
                >
                  {m.avatar_url ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={m.avatar_url}
                      alt={m.name}
                      className="size-full object-cover"
                    />
                  ) : (
                    (m.name ?? "?").slice(0, 1).toUpperCase()
                  )}
                </span>
              ))}
            </div>
            {pending!.pending > pending!.preview.length && (
              <span className="text-[9px] text-muted-foreground ml-1.5">
                +{pending!.pending - pending!.preview.length}
              </span>
            )}
          </div>
        )}
      </div>
      {group.joined ? (
        <span className="text-[10px] text-primary font-semibold">Aktif</span>
      ) : (
        <button
          onClick={onInvite}
          disabled={inviting}
          className="text-[10px] font-semibold text-primary disabled:opacity-50"
        >
          Undang
        </button>
      )}
    </div>
  );
}
