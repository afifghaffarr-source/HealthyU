import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { createDoctorReferral } from "@/features/scan/lib/scanBatch8.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/referral")({ component: Page });

function Page() {
  const fn = useServerFn(createDoctorReferral);
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { reason } }),
    onSuccess: () => toast.success("Referral dibuat"),
    onError: (e: Error) => toast.error(e.message),
  });
  type Referral = {
    urgency: "high" | "medium" | "low" | string;
    recommended_specialist: string;
    notes: string;
  };
  const r = mut.data?.referral as Referral | undefined;
  return (
    <div className="min-h-dvh pb-24 bg-background">
      <TopAppBar title="Doctor Referral" showBack />
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Jelaskan keluhan..."
          rows={5}
          className="w-full px-3 py-2 rounded-xl border bg-card"
        />
        <button
          onClick={() => mut.mutate()}
          disabled={!reason || mut.isPending}
          className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-medium"
        >
          Analisis & Buat Referral
        </button>
        {r && (
          <div className="rounded-2xl bg-card border p-4 space-y-2 text-sm">
            <div>
              <b>Urgency:</b>{" "}
              <span
                className={
                  r.urgency === "high"
                    ? "text-red-500"
                    : r.urgency === "medium"
                      ? "text-yellow-500"
                      : "text-green-500"
                }
              >
                {r.urgency}
              </span>
            </div>
            <div>
              <b>Spesialis:</b> {r.recommended_specialist}
            </div>
            <div className="text-muted-foreground">{r.notes}</div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
