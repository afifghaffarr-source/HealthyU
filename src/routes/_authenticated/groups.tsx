import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyGroups, createGroup, joinGroup } from "@/features/groups/lib/groups.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Plus, LogIn } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { toastError } from "@/lib/toast-config";
import { GroupCard } from "@/features/groups/components/GroupCard";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => createFn({ data: { name } }),
    onSuccess: (r) => {
      toast.success(t("groups.created", { code: r.invite_code }));
      setName("");
      qc.invalidateQueries({ queryKey: ["my-groups"] });
    },
    onError: (e) => toastError(e, t("groups.createFailed")),
  });

  const joinMut = useMutation({
    mutationFn: (c: string) => joinFn({ data: { invite_code: c.trim().toUpperCase() } }),
    onSuccess: (r) => {
      toast.success(t("groups.joined", { name: r.name }));
      setCode("");
      qc.invalidateQueries({ queryKey: ["my-groups"] });
    },
    onError: (e) => toastError(e, t("groups.joinFailed")),
  });

  const autoJoined = useRef(false);
  useEffect(() => {
    if (invite && !autoJoined.current) {
      autoJoined.current = true;
      joinMut.mutate(invite);
    }
  }, [invite, joinMut]);

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title={t("groups.title")} subtitle={t("groups.subtitle")} showBack />

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
          <div className="flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">{t("groups.createTitle")}</h2>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("groups.createPlaceholder")}
            maxLength={60}
            className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm"
          />
          <button
            disabled={!name.trim() || createMut.isPending}
            onClick={() => createMut.mutate()}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {createMut.isPending ? t("groups.creating") : t("groups.createBtn")}
          </button>
        </section>

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3">
          <div className="flex items-center gap-2">
            <LogIn className="size-4 text-primary" />
            <h2 className="font-semibold text-sm">{t("groups.joinTitle")}</h2>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("groups.joinPlaceholder")}
            maxLength={12}
            className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm uppercase tracking-widest text-center font-mono"
          />
          <button
            disabled={code.trim().length < 4 || joinMut.isPending}
            onClick={() => joinMut.mutate(code)}
            className="w-full bg-card outline-1 outline-black/10 font-semibold py-3 rounded-2xl disabled:opacity-60"
          >
            {joinMut.isPending ? t("groups.joining") : t("groups.joinBtn")}
          </button>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-sm px-1">{t("groups.myGroups")}</h2>
          {isLoading && <p className="text-sm text-muted-foreground px-1">{t("groups.loading")}</p>}
          {!isLoading && !groups.length && (
            <p className="text-sm text-muted-foreground px-1">{t("groups.empty")}</p>
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
