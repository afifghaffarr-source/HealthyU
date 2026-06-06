import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, Sparkles, X } from "lucide-react";

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Buka HealthyU AI Coach"
        className="fixed bottom-5 right-5 z-40 size-14 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-xl shadow-primary/40 grid place-items-center hover:scale-105 transition-transform"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-400 animate-pulse" />
        )}
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-[90vw] max-w-sm glass rounded-2xl border border-white/20 shadow-2xl p-4 animate-fade-up">
          <div className="flex items-center gap-2 pb-3 border-b border-white/10">
            <span className="size-8 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div>
              <p className="font-bold text-sm">HealthyU AI Coach</p>
              <p className="text-[10px] text-muted-foreground">AI · biasanya membalas instan</p>
            </div>
          </div>
          <div className="py-3 text-sm space-y-2">
            <p className="bg-muted/60 rounded-2xl rounded-tl-sm px-3 py-2 inline-block">
              Halo! Aku bisa bantu hitung kalori, susun meal plan, & jawab pertanyaan diet. Daftar
              dulu yuk?
            </p>
          </div>
          <Link
            to="/auth"
            className="block text-center bg-primary text-primary-foreground font-semibold text-xs py-2.5 rounded-xl"
          >
            Mulai chat (gratis)
          </Link>
        </div>
      )}
    </>
  );
}
