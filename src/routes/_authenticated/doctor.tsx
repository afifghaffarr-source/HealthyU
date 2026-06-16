import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { BottomNav } from "@/components/bottom-nav";
import { doctorChat } from "@/features/scan/lib/scanSocial.functions";
import { Send, Loader2, Stethoscope } from "lucide-react";
import { toast } from "@/lib/toast-config";

export const Route = createFileRoute("/_authenticated/doctor")({
  component: Page,
});

type Msg = { role: "user" | "assistant"; text: string };

function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const chat = useServerFn(doctorChat);
  const mut = useMutation({
    mutationFn: (m: string) => chat({ data: { message: m } }),
    onSuccess: (r) => setMessages((p) => [...p, { role: "assistant", text: r.reply }]),
    onError: (e: Error) => toast.error(e.message),
  });
  function send() {
    const t = input.trim();
    if (!t) return;
    setMessages((p) => [...p, { role: "user", text: t }]);
    setInput("");
    mut.mutate(t);
  }
  return (
    <div className="min-h-dvh pb-32 bg-background flex flex-col">
      <TopAppBar title="AI Health Advisor" showBack />
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-2 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-4 text-sm">
            <Stethoscope className="size-5 text-primary mb-2" />
            Edukasi kesehatan berbasis profil & obat-obatan kamu. <b>Bukan pengganti dokter.</b>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-3 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-card border mr-8"
            }`}
          >
            {m.text}
          </div>
        ))}
        {mut.isPending && (
          <div className="rounded-2xl bg-card border p-3 mr-8 inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Menganalisa…
          </div>
        )}
      </main>
      <div className="fixed bottom-20 inset-x-0 px-4">
        <div className="max-w-md mx-auto flex gap-2 bg-card border rounded-2xl p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Tanya seputar kesehatan…"
            className="flex-1 bg-transparent px-2 outline-none text-sm"
          />
          <button
            onClick={send}
            disabled={mut.isPending}
            className="rounded-xl bg-primary text-primary-foreground px-3 py-2"
            aria-label="Kirim pesan"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
