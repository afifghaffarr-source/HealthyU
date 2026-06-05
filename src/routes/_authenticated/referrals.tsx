import { createFileRoute } from "@tanstack/react-router";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getReferralInfo, applyReferralCode } from "@/features/referrals/lib/referrals.functions";
import { BottomNav } from "@/components/bottom-nav";
import { Copy, Share2, Gift, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/referrals")({
  component: ReferralsPage,
});

function ReferralsPage() {
  const qc = useQueryClient();
  const fetchFn = useServerFn(getReferralInfo);
  const applyFn = useServerFn(applyReferralCode);
  const { data } = useQuery({ queryKey: ["referrals"], queryFn: () => fetchFn() });
  const [input, setInput] = useState("");

  const apply = useMutation({
    mutationFn: (code: string) => applyFn({ data: { code: code.toUpperCase().trim() } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["referrals"] });
      toast.success(`Berhasil! +${r.earned} koin`);
      setInput("");
    },
    onError: (e) => toastError(e, "Gagal"),
  });

  const code = data?.code ?? "";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : "";

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    toast.success("Kode disalin");
  };

  const share = async () => {
    const text = `Yuk gabung HealthyU! Pakai kode ${code} dan dapatkan 50 koin bonus 🎁 ${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "HealthyU", text, url: shareUrl });
      } catch {
        // cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Link disalin");
    }
  };

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
        <TopAppBar title="Ajak Teman" showBack />

        <section className="bg-gradient-to-br from-sage to-sage-deep text-primary-foreground p-6 rounded-[2rem] animate-fade-up">
          <p className="text-xs uppercase tracking-widest text-white/70 font-bold">Kode Kamu</p>
          <p className="text-4xl font-bold tabular-nums tracking-wider my-3">{code || "—"}</p>
          <p className="text-sm text-white/80 mb-5">
            Bagikan kode ini. Setiap teman yang gabung kamu dapat <b>100 koin</b>, mereka dapat{" "}
            <b>50 koin</b>.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={copyCode}
              className="bg-white/15 backdrop-blur py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <Copy className="size-4" /> Salin
            </button>
            <button
              onClick={share}
              className="bg-white text-sage-deep py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <Share2 className="size-4" /> Bagikan
            </button>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 animate-fade-up">
          <Stat icon={<Users className="size-4" />} label="Diajak" value={`${data?.total ?? 0}`} />
          <Stat
            icon={<Gift className="size-4" />}
            label="Selesai"
            value={`${data?.completed ?? 0}`}
          />
          <Stat icon={<Gift className="size-4" />} label="Koin" value={`${data?.earned ?? 0}`} />
        </section>

        <section className="bg-card p-5 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
          <p className="font-bold">Punya kode dari teman?</p>
          <p className="text-xs text-muted-foreground">
            Masukkan sekali saja, dapat 50 koin bonus.
          </p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="KODE TEMAN"
              className="flex-1 bg-secondary/40 rounded-2xl px-4 py-3 text-sm tracking-wider uppercase"
            />
            <button
              onClick={() => apply.mutate(input)}
              disabled={!input || apply.isPending}
              className="bg-primary text-primary-foreground font-semibold px-5 rounded-2xl disabled:opacity-60"
            >
              Pakai
            </button>
          </div>
        </section>

        {(data?.referrals.length ?? 0) > 0 && (
          <section className="space-y-2 animate-fade-up">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Riwayat
            </h2>
            {data!.referrals.map((r) => (
              <div
                key={r.id}
                className="bg-card p-3 rounded-2xl outline-1 outline-black/5 flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("id-ID")}
                </span>
                <span className="font-semibold capitalize">{r.status}</span>
                <span className="text-primary font-bold tabular-nums">
                  +{r.referrer_reward_coins}
                </span>
              </div>
            ))}
          </section>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card p-3 rounded-2xl outline-1 outline-black/5 text-center">
      <div className="text-primary grid place-items-center mb-1">{icon}</div>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
