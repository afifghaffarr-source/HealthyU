import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Utensils, Timer, Moon, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HealthyU — Sahabat Sehat Berbasis AI" },
      { name: "description", content: "Diet personal, puasa terencana, jadwal sholat, dan AI nutrition coach dalam satu app." },
      { property: "og:title", content: "HealthyU — Sahabat Sehat Berbasis AI" },
      { property: "og:description", content: "Diet personal, puasa terencana, jadwal sholat, dan AI nutrition coach." },
    ],
  }),
  component: Index,
});

function Index() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto px-6 pt-16 pb-12 space-y-12">
        <header className="space-y-3 animate-fade-up">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="size-3" /> Powered by AI
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance">
            Sahabat sehat berbasis AI untuk hidup yang lebih bermakna.
          </h1>
          <p className="text-muted-foreground text-balance">
            Catat makanan Indonesia, atur puasa, ikuti jadwal sholat, dan tanya Dr. Healthy kapan saja.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 animate-fade-up">
          {[
            { icon: Utensils, label: "Database makanan Indonesia" },
            { icon: Timer, label: "Puasa 16:8 & Ramadhan" },
            { icon: Moon, label: "Jadwal sholat & lokasi" },
            { icon: Activity, label: "Lacak kalori & nutrisi" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="bg-card rounded-2xl p-4 outline-1 outline-black/5 shadow-sm">
              <Icon className="size-5 text-primary mb-2" />
              <p className="text-sm font-medium leading-snug">{label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3 animate-fade-up">
          {hasSession ? (
            <Link to="/dashboard" className="block w-full text-center bg-primary text-primary-foreground font-semibold py-4 rounded-2xl shadow-md shadow-primary/20">
              Buka Dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth" className="block w-full text-center bg-primary text-primary-foreground font-semibold py-4 rounded-2xl shadow-md shadow-primary/20">
                Mulai gratis
              </Link>
              <Link to="/auth" className="block w-full text-center bg-card text-foreground font-semibold py-4 rounded-2xl outline-1 outline-black/10">
                Sudah punya akun? Masuk
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Dirancang khusus untuk Indonesia · Bilingual ID/EN
        </p>
      </div>
    </main>
  );
}
