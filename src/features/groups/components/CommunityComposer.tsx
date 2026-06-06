import { Send } from "lucide-react";

export type CommunityCategory = {
  id: string;
  label: string;
};

export const COMMUNITY_CATS: ReadonlyArray<CommunityCategory> = [
  { id: "general", label: "Umum" },
  { id: "diet", label: "Diet" },
  { id: "fasting", label: "Puasa" },
  { id: "workout", label: "Latihan" },
  { id: "motivation", label: "Motivasi" },
] as const;

export function CommunityComposer({
  content,
  setContent,
  category,
  setCategory,
  onSubmit,
  submitting,
}: {
  content: string;
  setContent: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  return (
    <section className="bg-card p-4 rounded-3xl outline-1 outline-black/5 space-y-3 animate-fade-up">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, 1000))}
        placeholder="Apa yang ingin kamu bagikan?"
        rows={3}
        className="w-full bg-background outline-1 outline-black/10 rounded-2xl px-4 py-3 text-sm resize-none"
      />
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {COMMUNITY_CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              category === c.id ? "bg-primary text-primary-foreground" : "bg-mint text-sage-deep"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <button
        onClick={onSubmit}
        disabled={!content.trim() || submitting}
        className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 rounded-2xl disabled:opacity-50"
      >
        <Send className="size-4" /> Kirim
      </button>
    </section>
  );
}
