import { useState } from "react";
import { Check, Send } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <section className="max-w-3xl mx-auto px-5 md:px-8 py-16">
      <div className="glass rounded-3xl p-7 border border-white/15 text-center">
        <h3 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Dapat <span className="text-primary">ebook Meal Plan 7 hari</span> gratis
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Masukkan email — kirim PDF langsung ke inbox.
        </p>
        {subscribed ? (
          <p className="mt-4 text-primary font-semibold inline-flex items-center gap-2">
            <Check className="size-4" /> Cek inbox kamu ya!
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) setSubscribed(true);
            }}
            className="mt-4 flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="flex-1 bg-card border border-white/15 rounded-xl px-4 py-3 text-sm"
            />
            <button className="bg-primary text-primary-foreground font-semibold px-5 py-3 rounded-xl inline-flex items-center justify-center gap-2">
              <Send className="size-4" /> Kirim
            </button>
          </form>
        )}
      </div>
    </section>
  );
}