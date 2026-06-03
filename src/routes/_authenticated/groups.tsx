import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupLeaderboard,
} from "@/lib/groups.functions";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft,
  Users,
  Plus,
  LogIn,
  Copy,
  Share2,
  Trophy,
  Flame,
  LogOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ invite: z.string().optional() }).parse(s),
  component: GroupsPage,
});

function GroupsPage() {
  const qc = useQueryClient();
  const { invite } = Route.useSearch();
  const listFn = useServerFn(listMyGroups);
  const createFn = useServerFn(createGroup);
  const joinFn = useServerFn(joinGroup);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["my-groups"],
    queryFn: () => listFn(),
  });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { name } }),
    onSuccess: (r) => {
      toast.success(`Grup dibuat. Kode: ${r.invite_code}`);
      setName("");
      qc.invalidateQueries({ queryKey: ["my-groups"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal membuat grup"),
  });

  const joinMut = useMutation({
    mutationFn: (c: string) => joinFn({ data: { invite_code: c.trim().toUpperCase() } }),
    onSuccess: (r) => {
      toast.success(`Bergabung ke ${r.name}`);
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-groups"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Gagal bergabung"),
  });

  const autoJoined = useRef(false);
  useEffect(() => {
    if (invite && !autoJoined.current) {
      autoJoined.current = true;
      joinMut.mutate(invite);
    }
  }, [invite, joinMut]);

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-8 space-y-5">
        <header className="flex items-center gap-3">
          <Link
            to="/profile"
            className="size-10 bg-card rounded-2xl outline-1 outline-black/10 grid place-items-center"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Grup Teman</h1>
            <p className="text-xs text-muted-foreground">Leaderboard privat bersama teman</p>
          </div>
        </header>

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">Buat grup baru</h2>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama grup (mis. Keluarga Sehat)"
            maxLength={60}
            className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm"
          />
          <button
            disabled={!name.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {createMut.isPending ? "Membuat..." : "Buat Grup"}
          </button>
        </section>

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
          <div className="flex items-center gap-2">
            <LogIn className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">Gabung dengan kode</h2>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Kode undangan (6 huruf)"
            maxLength={12}
            className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm uppercase tracking-widest text-center font-mono"
          />
          <button
            disabled={code.trim().length < 4 || joinMut.isPending}
            onClick={() => joinMut.mutate()}
            className="w-full bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {joinMut.isPending ? "Bergabung..." : "Gabung"}
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-sm px-1">Grup Saya</h2>
          {isLoading && <p className="text-sm text-muted-foreground px-1">Memuat...</p>}
          {!isLoading && !groups.length && (
            <p className="text-sm text-muted-foreground px-1">
              Belum ada grup. Buat baru atau gabung dengan kode.
            </p>
          )}
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              open={selected === g.id}
              onToggle={() => setSelected(selected === g.id ? null : g.id)}
            />
          ))}
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function GroupCard({
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