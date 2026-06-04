import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — HealthyU" },
      {
        name: "description",
        content: "Masuk atau daftar ke HealthyU untuk mulai perjalanan sehatmu.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Cek email untuk konfirmasi akun.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Gagal masuk dengan Google");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/dashboard" });
    } catch {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <div className="max-w-md w-full mx-auto px-6 pt-12 pb-8 flex-1 flex flex-col">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-8"
        >
          <Sparkles className="size-3" /> HealthyU
        </Link>
        <h1 className="text-3xl font-bold mb-2">{mode === "login" ? "Masuk" : "Daftar"}</h1>
        <p className="text-muted-foreground mb-8">
          {mode === "login" ? "Lanjutkan perjalanan sehatmu." : "Mulai perjalanan sehat hari ini."}
        </p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-card outline-1 outline-black/10 font-semibold py-3.5 rounded-2xl mb-4 hover:bg-secondary/40 transition flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" className="size-5">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09a6.6 6.6 0 0 1 0-4.18V7.07H2.18a11.04 11.04 0 0 0 0 9.86l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
              fill="#EA4335"
            />
          </svg>
          Lanjut dengan Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">atau</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min. 6 karakter)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-card outline-1 outline-black/10 rounded-2xl px-4 py-3.5 text-sm focus:outline-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-2xl shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground text-center"
        >
          {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
          <span className="text-primary font-semibold">
            {mode === "login" ? "Daftar" : "Masuk"}
          </span>
        </button>
      </div>
    </main>
  );
}
