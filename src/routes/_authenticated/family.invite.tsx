import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createFamilyInvite, redeemFamilyInvite } from "@/lib/scanBatch8.functions";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated/family/invite")({
  validateSearch: z.object({ planId: z.string().uuid().optional(), token: z.string().optional() }),
  component: Page,
});

function Page() {
  const { planId, token: initial } = useSearch({ from: "/_authenticated/family/invite" });
  const createFn = useServerFn(createFamilyInvite);
  const redeemFn = useServerFn(redeemFamilyInvite);
  const [token, setToken] = useState(initial ?? "");
  const create = useMutation({
    mutationFn: () => createFn({ data: { planId: planId! } }),
    onSuccess: (r) => toast.success(`Token: ${(r.invite as any)?.token}`),
    onError: (e: Error) => toast.error(e.message),
  });
  const redeem = useMutation({
    mutationFn: () => redeemFn({ data: { token } }),
    onSuccess: () => toast.success("Bergabung dengan family plan!"),
    onError: (e: Error) => toast.error(e.message),
  });
  const inviteUrl = create.data?.invite ? `${window.location.origin}/family/invite?token=${(create.data.invite as any).token}` : "";
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Family Invite" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {planId && (
          <div className="rounded-2xl bg-card border p-4 space-y-2">
            <h3 className="font-semibold">Buat Undangan</h3>
            <button onClick={() => create.mutate()} disabled={create.isPending} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm">
              Generate Token
            </button>
            {inviteUrl && (
              <div className="space-y-2 pt-2">
                <img alt="qr" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`} className="mx-auto" />
                <p className="text-xs break-all text-center text-muted-foreground">{inviteUrl}</p>
              </div>
            )}
          </div>
        )}
        <div className="rounded-2xl bg-card border p-4 space-y-2">
          <h3 className="font-semibold">Gunakan Token</h3>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token" className="w-full px-3 py-2 rounded-lg border bg-background" />
          <button onClick={() => redeem.mutate()} disabled={!token || redeem.isPending} className="w-full rounded-lg border py-2 text-sm">
            Gabung
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}