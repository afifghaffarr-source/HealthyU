import { SafeMarkdown } from "@/components/SafeMarkdown";
import { Link } from "@tanstack/react-router";
import { BookOpen, Stethoscope, Utensils } from "lucide-react";

export type ChatMessage = { id: string; role: string; content: string };

const SUGGESTIONS = [
  "Protein saya kurang, makan apa?",
  "Ide menu warung yang lebih sehat",
  "Bantu evaluasi hari ini",
  "Makan malam ringan apa?",
  "Saya lewat target, harus bagaimana?",
];

export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="space-y-4 py-8 animate-fade-up">
      <div className="rounded-[1.75rem] border border-border/70 bg-card px-5 py-5 shadow-sm">
        <p className="font-bold mb-1">Halo, ada yang ingin ditanyakan?</p>
        <p className="text-sm text-muted-foreground">
          Aku HealthyU AI Coach — bisa bantu evaluasi makan, atur menu, atau jawab tanya soal nutrisi.
          Pilih contoh di bawah atau tulis pertanyaanmu.
        </p>
        <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] text-muted-foreground">
          <Stethoscope className="size-3.5 mt-0.5 shrink-0" aria-hidden />
          <span>
            Saran umum, bukan saran medis. Untuk kondisi medis tertentu, sebaiknya konsultasikan ke profesional.
          </span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/foods"
          className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 text-xs transition hover:bg-muted/60"
        >
          <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center" aria-hidden>
            <Utensils className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold truncate">Catat makan dulu</span>
            <span className="block text-muted-foreground text-[10px] truncate">Biar saran lebih pas</span>
          </span>
        </Link>
        <Link
          to="/articles"
          className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card p-3 text-xs transition hover:bg-muted/60"
        >
          <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center" aria-hidden>
            <BookOpen className="size-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold truncate">Baca artikel singkat</span>
            <span className="block text-muted-foreground text-[10px] truncate">2 menit, langsung pakai</span>
          </span>
        </Link>
      </div>
      <div className="space-y-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="w-full rounded-2xl border border-border/70 bg-card p-3 text-left text-sm transition hover:bg-muted/60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatMessages({
  messages,
  pending,
  streaming,
}: {
  messages: ChatMessage[];
  pending: boolean;
  streaming: string | null;
}) {
  return (
    <div className="space-y-3 py-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`min-w-0 max-w-[88%] break-words px-4 py-3 text-sm leading-relaxed shadow-sm ${
              m.role === "user"
                ? "rounded-[1.5rem] rounded-br-md bg-primary text-primary-foreground whitespace-pre-wrap"
                : "rounded-[1.5rem] rounded-bl-md border border-border/70 bg-card text-foreground prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:font-bold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:max-w-full prose-pre:overflow-x-auto prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-strong:text-foreground"
            }`}
          >
            {m.role === "assistant" ? (
              <SafeMarkdown>{m.content}</SafeMarkdown>
            ) : (
              m.content
            )}
          </div>
        </div>
      ))}
      {pending && (
        <div className="flex justify-start">
          <div className="min-w-0 max-w-[88%] rounded-[1.5rem] rounded-bl-md border border-border/70 bg-card px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-strong:text-foreground">
            {streaming ? (
              <SafeMarkdown>{streaming}</SafeMarkdown>
            ) : (
              <div className="flex items-center gap-2" aria-live="polite">
                <span className="flex gap-1" aria-hidden>
                  <span className="size-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="size-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.2s]" />
                  <span className="size-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.4s]" />
                </span>
                <span className="text-xs text-muted-foreground">Memikirkan jawaban…</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}