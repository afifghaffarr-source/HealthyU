import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createFamilyInvite, redeemFamilyInvite } from "@/lib/scanBatch8.functions";
import { toast } from "sonner";
import { z } from "zod";
import { Users, Copy, QrCode, Ticket, Share2 } from "lucide-react";

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
  const tokenStr = (create.data?.invite as any)?.token as string | undefined;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success("Disalin"); } catch { toast.error("Gagal salin"); }
  };
  const share = async () => {
    if (!inviteUrl) return;
    try {
      if (navigator.share) await navigator.share({ title: "Family Plan HealthyU", text: "Yuk gabung family plan saya!", url: inviteUrl });
      else await copy(inviteUrl);
    } catch { /* cancelled */ }
  };

  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Family Plan" subtitle="Ajak keluarga sehat bersama" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4 animate-fade-up">
        <section className="rounded-3xl p-5 bg-gradient-to-br from-primary via-primary/85 to-accent text-primary-foreground outline-1 outline-black/5">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
            <Users className="size-3" /> Family plan
          </div>
          <p className="mt-3 text-lg font-bold leading-snug">Sehat lebih seru bareng keluarga.</p>
          <p className="text-xs opacity-80 mt-1">Berbagi progres, meal plan, dan dukungan dalam satu plan.</p>
        </section>

        {planId && (
          <section className="rounded-3xl bg-card outline-1 outline-black/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-xl bg-primary/10 text-primary grid place-items-center"><QrCode className="size-4" /></div>
              <h3 className="font-bold text-sm">Buat undangan</h3>
            </div>
            <button
              onClick={() => create.mutate()}
              disabled={create.isPending}
              className="w-full rounded-2xl bg-primary text-primary-foreground py-3 text-sm font-semibold disabled:opacity-50"
            >
              {create.isPending ? "Membuat…" : tokenStr ? "Buat token baru" : "Generate token undangan"}
            </button>
            {inviteUrl && (
              <div className="space-y-3 pt-1 animate-fade-up">
                <div className="rounded-2xl bg-background outline-1 outline-black/5 p-3 grid place-items-center">
                  <img alt="QR" src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteUrl)}`} className="size-44" />
                </div>
                {tokenStr && (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5">
                    <span className="text-xs font-mono tracking-wider flex-1 truncate">{tokenStr}</span>
                    <button onClick={() => copy(tokenStr)} className="size-8 rounded-lg bg-background grid place-items-center" aria-label="Salin token">
                      <Copy className="size-3.5" />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => copy(inviteUrl)} className="rounded-xl bg-card outline-1 outline-black/10 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5">
                    <Copy className="size-3.5" /> Salin link
                  </button>
                  <button onClick={share} className="rounded-xl bg-primary text-primary-foreground py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5">
                    <Share2 className="size-3.5" /> Bagikan
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="rounded-3xl bg-card outline-1 outline-black/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-accent/15 text-accent grid place-items-center"><Ticket className="size-4" /></div>
            <h3 className="font-bold text-sm">Punya token?</h3>
          </div>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste token undangan"
            className="w-full px-3 py-3 rounded-xl outline-1 outline-black/10 bg-background text-sm font-mono"
          />
          <button
            onClick={() => redeem.mutate()}
            disabled={!token || redeem.isPending}
            className="w-full rounded-2xl bg-card outline-1 outline-primary/40 text-primary py-3 text-sm font-semibold disabled:opacity-50"
          >
            {redeem.isPending ? "Bergabung…" : "Gabung family plan"}
          </button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}