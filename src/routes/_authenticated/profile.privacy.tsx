import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { setAuditOptIn } from "@/lib/scanExtras.functions";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

const getPrivacy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase.from("profiles").select("scan_audit_opt_in").eq("id", userId).maybeSingle();
    return { auditOptIn: data?.scan_audit_opt_in ?? true };
  });

const opts = queryOptions({ queryKey: ["privacy"], queryFn: () => getPrivacy() });

export const Route = createFileRoute("/_authenticated/profile/privacy")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
  errorComponent: ({ error }) => <div className="p-4 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-4">Tidak ditemukan</div>,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  const qc = useQueryClient();
  const fn = useServerFn(setAuditOptIn);
  const m = useMutation({
    mutationFn: (enabled: boolean) => fn({ data: { enabled } }),
    onSuccess: () => { toast.success("Tersimpan"); qc.invalidateQueries({ queryKey: ["privacy"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Privasi" showBack />
      <div className="p-4 space-y-3">
        <div className="rounded-2xl bg-card border p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium text-sm">Bantu tingkatkan AI</div>
            <div className="text-xs text-muted-foreground mt-1">
              Izinkan koreksi scan makanan kamu dikirim secara anonim untuk audit kualitas AI.
            </div>
          </div>
          <button
            onClick={() => m.mutate(!data.auditOptIn)}
            disabled={m.isPending}
            className={`shrink-0 w-12 h-7 rounded-full relative transition ${data.auditOptIn ? "bg-primary" : "bg-muted"}`}
            aria-label="Toggle audit"
          >
            <span className={`absolute top-0.5 size-6 rounded-full bg-white transition ${data.auditOptIn ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}