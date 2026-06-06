import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGroupLeaderboard, leaveGroup } from "@/features/groups/lib/groups.functions";
import { Users, Copy, Share2, Trophy, Flame, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GroupCard({
  group,
  open,
  onToggle,
}: {
  group: { id: string; name: string; invite_code: string; member_count: number };
  open: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const lbFn = useServerFn(getGroupLeaderboard);
  const leaveFn = useServerFn(leaveGroup);

  const { data, isLoading } = useQuery({
    queryKey: ["group-lb", group.id],
    queryFn: () => lbFn({ data: { group_id: group.id } }),
    enabled: open,
  });

  const leaveMut = useMutation({
    mutationFn: () => leaveFn({ data: { group_id: group.id } }),
    onSuccess: () => {
      toast.success("Keluar dari grup");
      qc.invalidateQueries({ queryKey: ["my-groups"] });
    },
  });

  return (
    <div className="bg-card rounded-3xl outline-1 outline-black/5 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-2xl bg-primary/10 grid place-items-center text-primary">
            <Users className="size-5" />
          </div>
          <div>
            <p className="font-semibold">{group.name}</p>
            <p className="text-xs text-muted-foreground">{group.member_count} anggota</p>
          </div>
        </div>
        <Trophy className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4 space-y-3">
          <div className="flex items-center justify-between bg-background rounded-2xl px-4 py-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Kode undangan
              </p>
              <p className="font-mono font-bold tracking-widest">{group.invite_code}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(group.invite_code);
                toast.success("Kode disalin");
              }}
              className="size-9 rounded-xl bg-card outline-1 outline-black/10 grid place-items-center"
            >
              <Copy className="size-4" />
            </button>
            <button
              onClick={async () => {
                const url = `${window.location.origin}/groups?invite=${group.invite_code}`;
                const text = `Gabung grup "${group.name}" di SehatKu! Kode: ${group.invite_code}`;
                const nav = navigator as Navigator & {
                  share?: (d: { title?: string; text?: string; url?: string }) => Promise<void>;
                };
                if (nav.share) {
                  try {
                    await nav.share({ title: group.name, text, url });
                    return;
                  } catch {
                    /* user cancelled */
                  }
                }
                navigator.clipboard.writeText(url);
                toast.success("Link undangan disalin");
              }}
              className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center"
              aria-label="Bagikan link"
            >
              <Share2 className="size-4" />
            </button>
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {data?.members.map((m) => (
            <div
              key={m.user_id}
              className={`flex items-center gap-3 px-3 py-2 rounded-2xl ${m.is_me ? "bg-primary/10" : ""}`}
            >
              <span className="w-6 text-center font-bold text-sm text-muted-foreground">
                {m.rank}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {m.name} {m.is_me && <span className="text-xs text-primary">(Anda)</span>}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  Lv {m.level}
                  <Flame className="size-3 text-orange-500" /> {m.current_streak}
                </p>
              </div>
              <span className="font-bold tabular-nums text-sm">{m.xp} XP</span>
            </div>
          ))}

          <button
            onClick={() => leaveMut.mutate()}
            disabled={leaveMut.isPending}
            className="w-full flex items-center justify-center gap-2 text-destructive text-sm font-semibold py-2"
          >
            <LogOut className="size-4" /> Keluar dari grup
          </button>
        </div>
      )}
    </div>
  );
}
