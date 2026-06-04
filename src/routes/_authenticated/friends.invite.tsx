import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createFriendInvite, redeemFriendInvite } from "@/lib/scanBatch10.functions";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/friends/invite")({
  validateSearch: z.object({ token: z.string().optional() }),
  component: Page,
});

function Page() {
  const { token: initial } = useSearch({ from: "/_authenticated/friends/invite" });
  const createFn = useServerFn(createFriendInvite);
  const redeemFn = useServerFn(redeemFriendInvite);
  const [token, setToken] = useState(initial ?? "");
  const create = useMutation({
    mutationFn: () => createFn({ data: undefined as never }),
    onError: (e: Error) => toast.error(e.message),
  });
  const redeem = useMutation({
    mutationFn: () => redeemFn({ data: { token } }),
    onSuccess: () => toast.success("Berhasil menjadi teman!"),
    onError: (e: Error) => toast.error(e.message),
  });
  const link = create.data?.invite
    ? `${window.location.origin}/friends/invite?token=${(create.data.invite as any).token}`
    : "";
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Undang Teman" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <h3 className="font-semibold">Buat Link Undangan</h3>
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm"
          >
            Generate
          </button>
          {link && (
            <div className="space-y-2">
              <p className="text-xs break-all">{link}</p>
              <a
                href={`https://wa.me/?text=${encodeURIComponent("Yuk gabung HealthyU bareng aku! " + link)}`}
                target="_blank"
                rel="noreferrer"
                className="block text-center text-sm rounded-lg border py-2"
              >
                Share via WhatsApp
              </a>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <h3 className="font-semibold">Pakai Token</h3>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token"
            className="w-full px-3 py-2 rounded-lg border bg-background"
          />
          <button
            onClick={() => redeem.mutate()}
            disabled={!token || redeem.isPending}
            className="w-full rounded-lg border py-2 text-sm"
          >
            Tukar
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
