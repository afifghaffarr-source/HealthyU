import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ChatMessage = { id: string; role: string; content: string };

const SUGGESTIONS = [
  "Berapa kalori nasi goreng?",
  "Rekomendasi sarapan rendah karbo",
  "Apakah puasa 16:8 cocok untuk saya?",
  "Sahur sehat untuk Ramadhan",
];

export function ChatEmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="py-8 space-y-4 animate-fade-up">
      <div className="bg-card p-5 rounded-3xl outline-1 outline-black/5">
        <p className="font-bold mb-1">Selamat datang! 👋</p>
        <p className="text-sm text-muted-foreground">
          Saya Dr. Healthy. Tanyakan apa saja seputar nutrisi, diet, puasa, atau gaya hidup sehat.
        </p>
      </div>
      <div className="space-y-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="w-full text-left bg-card p-3 rounded-2xl outline-1 outline-black/5 text-sm hover:bg-secondary/40 transition"
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
          className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] px-4 py-3 rounded-3xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
                : "bg-card outline-1 outline-black/5 rounded-bl-md prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:font-bold prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-strong:text-foreground prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none"
            }`}
          >
            {m.role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            ) : (
              m.content
            )}
          </div>
        </div>
      ))}
      {pending && (
        <div className="flex justify-start">
          <div className="max-w-[85%] px-4 py-3 rounded-3xl rounded-bl-md text-sm leading-relaxed bg-card outline-1 outline-black/5 prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-strong:text-foreground">
            {streaming ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{streaming}</ReactMarkdown>
            ) : (
              <div className="flex gap-1">
                <span className="size-1.5 bg-primary rounded-full animate-pulse" />
                <span className="size-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.2s]" />
                <span className="size-1.5 bg-primary rounded-full animate-pulse [animation-delay:0.4s]" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}