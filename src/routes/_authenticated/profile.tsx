import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/features/profile/lib/profile.functions";
import { BottomNav } from "@/components/bottom-nav";
import { TopAppBar } from "@/components/healthyu/top-app-bar";
import { HealthCard } from "@/components/healthyu/health-card";
import { HealthScoreCard } from "@/components/healthyu/health-score-card";
import { supabase } from "@/integrations/supabase/client";
import { clearAll } from "@/lib/offline-queue";
import { calcAge, calcBMI, bmiCategory, calcBMR, calcTDEE, type ActivityLevel } from "@/lib/health";
import { LogOut, Camera, Sparkles, ChefHat, ChevronRight } from "lucide-react";
import { useTheme } from "@/components/theme-provider.hook";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ProfileNavGrid } from "@/features/profile/components/ProfileNavGrid";
import { DisclaimerCard } from "@/components/healthyu/disclaimer-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const fetchProfile = useServerFn(getProfile);
  const { data: p, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const handleLogout = async () => {
    try {
      await clearAll();
    } catch (err) {
      console.error("[logout] Failed to clear offline queue:", err);
    }
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const bmi =
    p?.height_cm && p?.weight_kg ? calcBMI(Number(p.weight_kg), Number(p.height_cm)) : null;
  const cat = bmi ? bmiCategory(bmi) : null;
  const bmr =
    p?.height_cm && p?.weight_kg && (p?.gender === "male" || p?.gender === "female")
      ? calcBMR({
          weightKg: Number(p.weight_kg),
          heightCm: Number(p.height_cm),
          age: calcAge(p.birth_date),
          gender: p.gender,
        })
      : null;
  const tdee = bmr && p?.activity_level ? calcTDEE(bmr, p.activity_level as ActivityLevel) : null;

  if (isLoading && !p) {
    return (
      <main className="min-h-dvh bg-background pb-28">
        <div className="max-w-md mx-auto px-5 pt-2 space-y-5">
          <TopAppBar title="Profil" subtitle="Memuat…" showBack />
          <div className="bg-card p-6 rounded-3xl outline-1 outline-foreground/10 text-center animate-pulse">
            <div className="size-20 mx-auto rounded-full bg-muted mb-3" />
            <div className="h-5 w-32 mx-auto bg-muted rounded mb-2" />
            <div className="h-3 w-24 mx-auto bg-muted rounded" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-24 bg-card rounded-2xl outline-1 outline-foreground/10 animate-pulse"
              />
            ))}
          </div>
          <div className="h-40 bg-card rounded-3xl outline-1 outline-foreground/10 animate-pulse" />
          <div className="h-48 bg-card rounded-3xl outline-1 outline-foreground/10 animate-pulse" />
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background pb-28">
      <div className="max-w-md mx-auto px-5 pt-2 space-y-6">
        <TopAppBar title="Profil" subtitle={p?.full_name ?? "Sahabat"} showBack />

        {/* ── Section A: Identitas ─────────────────────────────────────────── */}
        <section className="bg-card p-6 rounded-3xl outline-1 outline-foreground/10 text-center animate-fade-up">
          <div className="size-20 mx-auto rounded-full bg-primary text-primary-foreground grid place-items-center text-2xl font-bold mb-3">
            {(p?.full_name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <h2 className="text-xl font-bold">{p?.full_name ?? "Sahabat"}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {p?.dietary_preference ?? "Balanced diet"}
          </p>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1 mt-3 text-sm text-primary font-medium hover:underline"
          >
            Edit profil <ChevronRight className="size-3.5" />
          </Link>
        </section>

        {/* ── Section B: Kesehatan (BMI / BMR / TDEE + HealthScore) ──────── */}
        {bmi && (
          <>
            <section className="grid grid-cols-3 gap-3 animate-fade-up">
              <HealthCard label="BMI" value={bmi.toString()} trend={cat?.label} tone="green" />
              <HealthCard label="BMR" value={bmr ?? "-"} unit="kcal" tone="orange" />
              <HealthCard label="TDEE" value={tdee ?? "-"} unit="kcal" tone="blue" />
            </section>

            <HealthScoreCard
              className="animate-fade-up"
              factors={[
                {
                  label: "BMI",
                  value:
                    bmi >= 18.5 && bmi <= 24.9 ? 100 : Math.max(0, 100 - Math.abs(bmi - 22) * 8),
                },
                { label: "Aktivitas", value: activityScore(p?.activity_level) },
                {
                  label: "Target berat",
                  value: weightTargetScore(Number(p?.weight_kg), Number(p?.target_weight_kg)),
                },
                { label: "Kalori harian", value: p?.daily_calorie_target ? 80 : 40 },
              ]}
            />
          </>
        )}

        {/* ── Section C: Aksi Cepat (3 featured) ──────────────────────────── */}
        <section className="animate-fade-up">
          <h3 className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-3">
            Aksi Cepat
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/scan"
              className="bg-card p-4 rounded-2xl outline-1 outline-foreground/10 flex flex-col items-start gap-2 min-h-24 active:scale-[0.98] transition hover:bg-accent"
            >
              <Camera className="size-6 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold leading-tight">Scan</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Foto, barcode, menu
                </p>
              </div>
            </Link>
            <Link
              to="/coach"
              className="bg-card p-4 rounded-2xl outline-1 outline-foreground/10 flex flex-col items-start gap-2 min-h-24 active:scale-[0.98] transition hover:bg-accent"
            >
              <Sparkles className="size-6 text-coral" aria-hidden />
              <div>
                <p className="text-sm font-semibold leading-tight">AI Coach</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Tanya & insight
                </p>
              </div>
            </Link>
            <Link
              to="/resep/tersimpan"
              className="bg-card p-4 rounded-2xl outline-1 outline-foreground/10 flex flex-col items-start gap-2 min-h-24 active:scale-[0.98] transition hover:bg-accent"
            >
              <ChefHat className="size-6 text-sage-deep" aria-hidden />
              <div>
                <p className="text-sm font-semibold leading-tight">Resep</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                  Yang lo simpan
                </p>
              </div>
            </Link>
          </div>
          <Link
            to="/resep"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-1"
          >
            Jelajahi semua resep <ChevronRight className="size-3" />
          </Link>
        </section>

        {/* ── Section D: Fitur Lengkap (organized nav grid) ───────────────── */}
        <section className="animate-fade-up">
          <h3 className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-3">
            Fitur Lainnya
          </h3>
          <ProfileNavGrid theme={theme} onToggleTheme={toggle} />
        </section>

        {/* ── Section E: Akun (theme, locale, logout) ─────────────────────── */}
        <section className="space-y-2 pt-2 animate-fade-up">
          <DisclaimerCard />

          <div className="rounded-2xl bg-destructive/5 dark:bg-destructive/10 outline-1 outline-destructive/25 p-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  className="w-full flex items-center justify-center gap-2 text-destructive font-semibold py-3 rounded-xl hover:bg-destructive/10 transition min-h-11"
                  aria-label="Keluar dari akun"
                >
                  <LogOut className="size-4" /> Keluar dari akun
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Keluar dari HealthyU?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Kamu akan keluar dari akun ini. Data tetap aman dan bisa diakses lagi saat masuk
                    kembali.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLogout}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ya, keluar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <LocaleSwitcher />
        </section>
      </div>
      <BottomNav />
    </main>
  );
}

function activityScore(level: string | null | undefined): number {
  switch (level) {
    case "very_active":
      return 100;
    case "active":
      return 85;
    case "moderate":
      return 70;
    case "light":
      return 55;
    case "sedentary":
      return 35;
    default:
      return 50;
  }
}

function weightTargetScore(weight: number, target: number): number {
  if (!weight || !target) return 50;
  const diff = Math.abs(weight - target);
  return Math.max(0, Math.round(100 - diff * 4));
}
